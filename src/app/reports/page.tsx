'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { FileBarChart, BarChart2, TrendingUp, Users, ArrowRight, Download, PieChart, RefreshCw, CheckCircle2, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isDemoMode, isDemoOnlyRoute } from '@/lib/demoMode';

interface ReportStat {
  label: string;
  value: string;
}

interface ReportLink {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  badge: string;
  stats?: ReportStat[];
}

export default function ReportsPage() {
  const [stats, setStats] = useState({ interviews: 0, candidates: 0, completionRate: 0, avgScore: 0, loading: true });

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        const supabase = createClient();
        const [interviewsResult, completedResult, candidatesResult, scoresResult] = await Promise.all([
          supabase.from('interviews').select('id', { count: 'exact', head: true }),
          supabase.from('interviews').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('candidates').select('id', { count: 'exact', head: true }),
          supabase.from('interviews').select('overall_score').eq('status', 'completed').not('overall_score', 'is', null),
        ]);

        const totalInterviews = interviewsResult.count;
        const completedInterviews = completedResult.count;
        const totalCandidates = candidatesResult.count;
        const scoreData = scoresResult.data;

        const total = totalInterviews ?? 0;
        const completed = completedInterviews ?? 0;
        const candidates = totalCandidates ?? 0;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const scores = scoreData?.map(r => r.overall_score).filter(Boolean) ?? [];
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        if (!cancelled) setStats({ interviews: total, candidates, completionRate, avgScore, loading: false });
      } catch {
        if (!cancelled) setStats({ interviews: 0, candidates: 0, completionRate: 0, avgScore: 0, loading: false });
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  const reportLinks: ReportLink[] = [
    {
      title: 'Interview Analytics',
      description: 'Score distributions, completion rates, competency breakdowns, and candidate segments.',
      href: '/analytics',
      icon: <BarChart2 size={20} className="text-teal-600" />,
      color: 'bg-teal-50 border-teal-100',
      badge: 'Live Data',
      stats: [
        { label: 'Total Interviews', value: stats.loading ? '—' : stats.interviews.toLocaleString() },
        { label: 'Completion Rate', value: stats.loading ? '—' : `${stats.completionRate}%` },
      ],
    },
    {
      title: 'Platform Analytics',
      description: 'User acquisition, engagement metrics, cohort forecasts, and strategic KPIs.',
      href: '/platform-analytics',
      icon: <TrendingUp size={20} className="text-blue-600" />,
      color: 'bg-blue-50 border-blue-100',
      badge: 'Demo',
      stats: [
        { label: 'Total Candidates', value: stats.loading ? '—' : stats.candidates.toLocaleString() },
        { label: 'Avg Score', value: stats.loading ? '—' : `${stats.avgScore}%` },
      ],
    },
    {
      title: 'Custom Report Builder',
      description: 'Drag-and-drop metrics, custom filters, date ranges, and scheduled delivery.',
      href: '/report-builder',
      icon: <FileBarChart size={20} className="text-violet-600" />,
      color: 'bg-violet-50 border-violet-100',
      badge: 'Demo',
    },
    {
      title: 'Candidate Segmentation',
      description: 'Segment candidates by institution, role, skill, and performance tier.',
      href: '/candidate-segmentation',
      icon: <Users size={20} className="text-amber-600" />,
      color: 'bg-amber-50 border-amber-100',
      badge: 'Demo',
    },
    {
      title: 'Performance Monitor',
      description: 'Query execution times, cache hit rates, API latency, and DB connection health.',
      href: '/performance-monitor',
      icon: <PieChart size={20} className="text-rose-600" />,
      color: 'bg-rose-50 border-rose-100',
      badge: 'Demo',
    },
    {
      title: 'AI Usage Analytics',
      description: 'API call volumes, token consumption, cost trends, and endpoint health.',
      href: '/ai-usage',
      icon: <Star size={20} className="text-indigo-600" />,
      color: 'bg-indigo-50 border-indigo-100',
      badge: 'Demo',
    },
  ].filter((link) => isDemoMode() || !isDemoOnlyRoute(link.href));

  return (
    <AppLayout role="recruiter">
      <div className="space-y-6 fade-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Reports & Analytics</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Access all reporting tools and analytics dashboards from one place.</p>
          </div>
          {stats.loading && <RefreshCw size={16} className="text-[#6B7A99] animate-spin mt-1" />}
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Interviews', value: stats.loading ? '—' : stats.interviews.toLocaleString(), icon: <BarChart2 size={16} className="text-teal-600" />, bg: 'bg-teal-50' },
            { label: 'Total Candidates', value: stats.loading ? '—' : stats.candidates.toLocaleString(), icon: <Users size={16} className="text-blue-600" />, bg: 'bg-blue-50' },
            { label: 'Completion Rate', value: stats.loading ? '—' : `${stats.completionRate}%`, icon: <CheckCircle2 size={16} className="text-emerald-600" />, bg: 'bg-emerald-50' },
            { label: 'Avg Score', value: stats.loading ? '—' : `${stats.avgScore}%`, icon: <TrendingUp size={16} className="text-violet-600" />, bg: 'bg-violet-50' },
          ].map(kpi => (
            <div key={kpi.label} className={`bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm ${stats.loading ? 'animate-pulse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-2`}>{kpi.icon}</div>
              <p className="text-xl font-800 text-[#0D1B3E]">{kpi.value}</p>
              <p className="text-xs text-[#6B7A99] mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportLinks?.map(report => (
            <Link
              key={report?.href}
              href={report?.href}
              className={`group bg-white border-2 ${report?.color} rounded-2xl p-5 hover:shadow-md transition-all duration-200 block`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${report?.color} flex items-center justify-center`}>
                  {report?.icon}
                </div>
                <span className="text-[10px] font-700 bg-white border border-[#E8ECF4] text-[#6B7A99] px-2 py-0.5 rounded-full">
                  {report?.badge}
                </span>
              </div>
              <h3 className="text-sm font-800 text-[#0D1B3E] mb-1.5">{report?.title}</h3>
              <p className="text-xs text-[#6B7A99] leading-relaxed mb-3">{report?.description}</p>
              {report.stats && (
                <div className="flex gap-4 mb-3">
                  {report.stats.map(s => (
                    <div key={s.label}>
                      <p className="text-sm font-800 text-[#0D1B3E]">{s.value}</p>
                      <p className="text-[10px] text-[#6B7A99]">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs font-600 text-[#0D9488] group-hover:gap-2 transition-all">
                Open Report <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-[#F0FDFB] border border-teal-100 rounded-xl p-5 flex items-start gap-3">
          <Download size={16} className="text-teal-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-700 text-[#0D1B3E]">Need raw data exports?</p>
            <p className="text-xs text-[#6B7A99] mt-0.5">
              Download CSV exports of candidates, interviews, and feedback from the{' '}
              <Link href="/admin-dashboard" className="text-[#0D9488] font-600 hover:underline">Admin Dashboard → CSV Exports</Link> tab.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
