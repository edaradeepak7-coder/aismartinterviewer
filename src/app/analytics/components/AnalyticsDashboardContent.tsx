'use client';
import React, { useState } from 'react';
import { Download, RefreshCw, BarChart2, TrendingUp, Star } from 'lucide-react';
import AnalyticsFiltersBar, { AnalyticsFilters } from './AnalyticsFilters';
import AnalyticsKPIRow from './AnalyticsKPIRow';
import VolumeChart from './VolumeChart';
import CompletionRateChart from './CompletionRateChart';
import ScoreDistributionAnalyticsChart from './ScoreDistributionAnalyticsChart';
import CompetencyBreakdownChart from './CompetencyBreakdownChart';
import CandidateSegmentChart from './CandidateSegmentChart';
import QuestionCategoryChart from './QuestionCategoryChart';

const DEFAULT_FILTERS: AnalyticsFilters = {
  dateRange: '30d',
  job: 'all',
  role: 'all',
  segment: 'all',
};

const DATE_RANGE_LABELS: Record<string, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  'custom': 'Custom range',
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'performance', label: 'Performance' },
  { id: 'segments', label: 'Segments' },
  { id: 'questions', label: 'Questions' },
];

export default function AnalyticsDashboardContent() {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <BarChart2 size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Analytics</h1>
          </div>
        </div>

        {/* Stat pills */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <TrendingUp size={16} className="text-[#0D9488]" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">0</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Interviews</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Star size={16} className="text-amber-400" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">—</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Avg Score</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] transition-colors bg-white">
              <RefreshCw size={14} />
              Refresh
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] transition-colors bg-white">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-[#E8ECF4]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px',
              activeTab === tab.id
                ? 'border-[#0D9488] text-[#0D9488]'
                : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <AnalyticsFiltersBar filters={filters} onChange={setFilters} />

      {/* KPIs */}
      <AnalyticsKPIRow />

      {/* Row 1: Volume + Completion Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VolumeChart />
        </div>
        <div>
          <CompletionRateChart />
        </div>
      </div>

      {/* Row 2: Score Distribution + Competency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScoreDistributionAnalyticsChart />
        <CompetencyBreakdownChart />
      </div>

      {/* Row 3: Candidate Segments + Question Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CandidateSegmentChart />
        <QuestionCategoryChart />
      </div>
    </div>
  );
}
