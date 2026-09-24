'use client';

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart2,
  Trophy,
  Zap,
  Receipt,
  TrendingUp,
  Users,
  Star,
  ClipboardList,
  PieChart,
  Layers,
  FileBarChart,
  ShieldAlert,
  LineChart,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AttractiveSpinner from '@/components/ui/AttractiveSpinner';

type Role = 'candidate' | 'recruiter' | 'admin';

interface TabDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  Component: React.ComponentType;
}

/** Shared loading state used while a tab's content chunk is fetched/mounted. */
function TabLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <AttractiveSpinner size="xl" variant="orbit" color="primary" />
      <p className="text-sm text-muted-foreground">Loading insights…</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Candidate content                                                   */
/* ------------------------------------------------------------------ */
const CandidateOverview = dynamic(() => import('@/app/components/CandidateDashboardContent'), { loading: () => <TabLoader />, ssr: false });
const ProgressCenter = dynamic(() => import('@/app/progress-center/components/ProgressCenterContent'), { loading: () => <TabLoader />, ssr: false });
const Leaderboard = dynamic(() => import('@/app/leaderboard/page').then((m) => m.LeaderboardContent), { loading: () => <TabLoader />, ssr: false });
const ActivityFeed = dynamic(() => import('@/app/activity-feed/components/ActivityFeedContent'), { loading: () => <TabLoader />, ssr: false });
const CreditReport = dynamic(() => import('@/app/credit-report/components/CreditReportContent'), { loading: () => <TabLoader />, ssr: false });
const CreditROI = dynamic(() => import('@/app/credit-roi/components/CreditROIContent'), { loading: () => <TabLoader />, ssr: false });

/* ------------------------------------------------------------------ */
/* Recruiter content                                                   */
/* ------------------------------------------------------------------ */
const RecruiterOverview = dynamic(() => import('@/app/recruiter-dashboard/components/RecruiterDashboardContent'), { loading: () => <TabLoader />, ssr: false });
const RecruiterAnalytics = dynamic(() => import('@/app/recruiter-analytics/components/RecruiterAnalyticsDashboard'), { loading: () => <TabLoader />, ssr: false });
const InterviewAnalytics = dynamic(() => import('@/app/analytics/components/AnalyticsDashboardContent'), { loading: () => <TabLoader />, ssr: false });
const InterviewerPerformance = dynamic(() => import('@/app/interviewer-performance/components/InterviewerPerformanceContent'), { loading: () => <TabLoader />, ssr: false });
const AssessmentResults = dynamic(() => import('@/app/assessment-results/components/AssessmentResultsContent'), { loading: () => <TabLoader />, ssr: false });

/* ------------------------------------------------------------------ */
/* Admin content                                                       */
/* ------------------------------------------------------------------ */
const AdminDashboard = dynamic(() => import('@/app/admin-dashboard/components/AdminDashboardContent'), { loading: () => <TabLoader />, ssr: false });
const PlatformAnalytics = dynamic(() => import('@/app/platform-analytics/components/PlatformAnalyticsContent'), { loading: () => <TabLoader />, ssr: false });
const CohortAnalytics = dynamic(() => import('@/app/admin/cohort-analytics/components/CohortAnalyticsContent'), { loading: () => <TabLoader />, ssr: false });
const ReportBuilder = dynamic(() => import('@/app/report-builder/components/ReportBuilderContent'), { loading: () => <TabLoader />, ssr: false });
const SecurityDashboard = dynamic(() => import('@/app/security-dashboard/components/SecurityDashboardContent'), { loading: () => <TabLoader />, ssr: false });

const TABS_BY_ROLE: Record<Role, TabDef[]> = {
  candidate: [
    { id: 'overview', label: 'Overview', description: 'Your dashboard at a glance', icon: <LayoutDashboard size={16} />, Component: CandidateOverview },
    { id: 'progress', label: 'Progress Center', description: 'Skill growth over time', icon: <BarChart2 size={16} />, Component: ProgressCenter },
    { id: 'leaderboard', label: 'Leaderboard', description: 'Where you rank', icon: <Trophy size={16} />, Component: Leaderboard },
    { id: 'activity', label: 'Activity Feed', description: 'Your recent activity', icon: <Zap size={16} />, Component: ActivityFeed },
    { id: 'credit-report', label: 'Credit Report', description: 'Credit usage breakdown', icon: <Receipt size={16} />, Component: CreditReport },
    { id: 'credit-roi', label: 'Credit ROI', description: 'Value from your credits', icon: <TrendingUp size={16} />, Component: CreditROI },
  ],
  recruiter: [
    { id: 'overview', label: 'Overview', description: 'Hiring dashboard', icon: <LayoutDashboard size={16} />, Component: RecruiterOverview },
    { id: 'recruiter-analytics', label: 'Recruiter Analytics', description: 'Pipeline & outcomes', icon: <BarChart2 size={16} />, Component: RecruiterAnalytics },
    { id: 'interview-analytics', label: 'Interview Analytics', description: 'Interview trends', icon: <LineChart size={16} />, Component: InterviewAnalytics },
    { id: 'interviewer-performance', label: 'Interviewer Performance', description: 'Panel effectiveness', icon: <Star size={16} />, Component: InterviewerPerformance },
    { id: 'assessment-results', label: 'Assessment Results', description: 'Test outcomes', icon: <ClipboardList size={16} />, Component: AssessmentResults },
  ],
  admin: [
    { id: 'admin-dashboard', label: 'Admin Dashboard', description: 'Operational overview', icon: <LayoutDashboard size={16} />, Component: AdminDashboard },
    { id: 'platform-analytics', label: 'Platform Analytics', description: 'Conversion & funnels', icon: <PieChart size={16} />, Component: PlatformAnalytics },
    { id: 'cohort-analytics', label: 'Cohort & Funnel', description: 'Retention & cohorts', icon: <Layers size={16} />, Component: CohortAnalytics },
    { id: 'interview-analytics', label: 'Interview Analytics', description: 'Interview trends', icon: <LineChart size={16} />, Component: InterviewAnalytics },
    { id: 'report-builder', label: 'Report Builder', description: 'Custom reports', icon: <FileBarChart size={16} />, Component: ReportBuilder },
    { id: 'assessment-results', label: 'Assessment Results', description: 'Test outcomes', icon: <ClipboardList size={16} />, Component: AssessmentResults },
    { id: 'security', label: 'Security', description: 'Threats & access', icon: <ShieldAlert size={16} />, Component: SecurityDashboard },
  ],
};

const ROLE_HEADING: Record<Role, string> = {
  candidate: 'Your Insights',
  recruiter: 'Recruiting Insights',
  admin: 'Platform Insights',
};

export default function InsightsHub() {
  const { getSidebarRole, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const role: Role = loading ? 'candidate' : getSidebarRole();
  const tabs = useMemo(() => TABS_BY_ROLE[role] ?? TABS_BY_ROLE.candidate, [role]);

  const initialTab = searchParams.get('tab');
  const [activeId, setActiveId] = useState<string>(
    tabs.some((t) => t.id === initialTab) ? (initialTab as string) : tabs[0].id,
  );

  // Keep the active tab valid whenever the role (and therefore tab set) changes.
  useEffect(() => {
    if (!tabs.some((t) => t.id === activeId)) {
      setActiveId(tabs[0].id);
    }
  }, [tabs, activeId]);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const ActiveComponent = active.Component;

  const selectTab = (id: string) => {
    setActiveId(id);
    // Shallow URL update so tabs are shareable/back-button friendly.
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('tab', id);
    router.replace(`/insights?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart2 size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">{ROLE_HEADING[role]}</h1>
            <p className="text-sm text-muted-foreground">{active.description}</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto -mb-px">
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`group inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <span className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active panel */}
      <div key={active.id}>
        <ActiveComponent />
      </div>
    </div>
  );
}
