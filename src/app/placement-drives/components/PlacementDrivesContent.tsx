'use client';
import React, { useState } from 'react';
import { Target, Building2, CheckCircle, Plus, Search, Filter, ChevronRight, TrendingUp, Eye, Edit2, MoreHorizontal } from 'lucide-react';

type Tab = 'drives' | 'pipeline' | 'analytics';

const TABS: { id: Tab; label: string }[] = [
  { id: 'drives', label: 'Placement Drives' },
  { id: 'pipeline', label: 'Drive Pipeline' },
  { id: 'analytics', label: 'Analytics' },
];

const drives = [
  {
    id: 1, company: 'Google', role: 'SDE II', batch: '2026', institution: 'IIT Bombay',
    eligibility: 'CS/IT, CGPA ≥ 8.0', enrolled: 124, shortlisted: 42, assessed: 28, interviewed: 18, selected: 8,
    status: 'completed', date: '2026-08-15', package: '₹28L',
    stages: ['Enrollment', 'Assessment', 'AI Interview', 'Technical', 'HR', 'Selection']
  },
  {
    id: 2, company: 'Microsoft', role: 'Software Engineer', batch: '2026', institution: 'IIT Bombay',
    eligibility: 'CS/IT/ECE, CGPA ≥ 7.5', enrolled: 198, shortlisted: 67, assessed: 45, interviewed: 30, selected: 12,
    status: 'completed', date: '2026-08-22', package: '₹32L',
    stages: ['Enrollment', 'Assessment', 'AI Interview', 'Technical', 'HR', 'Selection']
  },
  {
    id: 3, company: 'Infosys', role: 'Systems Engineer', batch: '2026', institution: 'IIT Bombay',
    eligibility: 'All branches, CGPA ≥ 6.5', enrolled: 842, shortlisted: 320, assessed: 280, interviewed: 0, selected: 0,
    status: 'active', date: '2026-09-10', package: '₹6.5L',
    stages: ['Enrollment', 'Assessment', 'AI Interview', 'Technical', 'HR', 'Selection']
  },
  {
    id: 4, company: 'Amazon', role: 'SDE I', batch: '2026', institution: 'IIT Bombay',
    eligibility: 'CS/IT, CGPA ≥ 7.0', enrolled: 0, shortlisted: 0, assessed: 0, interviewed: 0, selected: 0,
    status: 'upcoming', date: '2026-09-20', package: '₹24L',
    stages: ['Enrollment', 'Assessment', 'AI Interview', 'Technical', 'HR', 'Selection']
  },
];

const pipelineData = [
  { stage: 'Enrollment Open', count: 1164, color: 'bg-blue-500' },
  { stage: 'Shortlisted', count: 429, color: 'bg-violet-500' },
  { stage: 'Assessment Done', count: 353, color: 'bg-amber-500' },
  { stage: 'AI Interview', count: 48, color: 'bg-orange-500' },
  { stage: 'Technical Round', count: 30, color: 'bg-rose-500' },
  { stage: 'HR Round', count: 18, color: 'bg-pink-500' },
  { stage: 'Selected', count: 20, color: 'bg-green-500' },
  { stage: 'Offer Accepted', count: 16, color: 'bg-emerald-500' },
];

function DriveStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-50 text-green-700',
    active: 'bg-blue-50 text-blue-700',
    upcoming: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-red-50 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-600 ${map[status] || 'bg-gray-50 text-gray-600'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export default function PlacementDrivesContent() {
  const [activeTab, setActiveTab] = useState<Tab>('drives');
  const [selectedDrive, setSelectedDrive] = useState<number | null>(null);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Target size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Placement Drives</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Manage end-to-end placement drives across institutions</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          {[
            { label: 'Active Drives', value: '1', color: 'text-blue-600' },
            { label: 'Total Selected', value: '20', color: 'text-green-600' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
              <div>
                <p className={`text-base font-800 ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-[#6B7A99]">{stat.label}</p>
              </div>
            </div>
          ))}
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg">
            <Plus size={14} /> Create Drive
          </button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-[#E8ECF4]">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={['px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'].join(' ')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Drives Tab */}
      {activeTab === 'drives' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
              <input placeholder="Search drives..." className="w-full pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white"><Filter size={14} /> Filter</button>
          </div>

          <div className="space-y-4">
            {drives.map((drive) => (
              <div key={drive.id} className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                        <Building2 size={20} className="text-violet-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-800 text-[#0D1B3E]">{drive.company}</p>
                          <DriveStatusBadge status={drive.status} />
                        </div>
                        <p className="text-sm text-[#6B7A99]">{drive.role} · {drive.institution}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-[#6B7A99]">Eligibility: {drive.eligibility}</span>
                          <span className="text-xs font-700 text-[#0D9488]">{drive.package} CTC</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors"><Eye size={14} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors"><Edit2 size={14} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors"><MoreHorizontal size={14} /></button>
                    </div>
                  </div>

                  {/* Stage Progress */}
                  <div className="mt-4 grid grid-cols-6 gap-1">
                    {[
                      { label: 'Enrolled', value: drive.enrolled },
                      { label: 'Shortlisted', value: drive.shortlisted },
                      { label: 'Assessed', value: drive.assessed },
                      { label: 'Interviewed', value: drive.interviewed },
                      { label: 'Selected', value: drive.selected },
                      { label: 'Date', value: drive.date },
                    ].map((item, i) => (
                      <div key={item.label} className={`text-center p-2 rounded-lg ${i < 5 && item.value > 0 ? 'bg-[#F0FDF9]' : 'bg-[#F8FAFC]'}`}>
                        <p className={`text-sm font-800 ${i < 5 && item.value > 0 ? 'text-[#0D9488]' : 'text-[#6B7A99]'}`}>{item.value}</p>
                        <p className="text-[10px] text-[#6B7A99]">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Drive Workflow */}
                  <div className="mt-4 flex items-center gap-1 overflow-x-auto">
                    {drive.stages.map((stage, i) => (
                      <React.Fragment key={stage}>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-600 whitespace-nowrap ${
                          i === 0 && drive.enrolled > 0 ? 'bg-[#0D9488] text-white' :
                          i === 1 && drive.shortlisted > 0 ? 'bg-[#0D9488] text-white' :
                          i === 2 && drive.assessed > 0 ? 'bg-[#0D9488] text-white' :
                          i === 3 && drive.interviewed > 0 ? 'bg-[#0D9488] text-white' :
                          i === 4 && drive.selected > 0 ? 'bg-[#0D9488] text-white': 'bg-[#F4F6FA] text-[#6B7A99]'
                        }`}>
                          {i < 5 && (i === 0 ? drive.enrolled : i === 1 ? drive.shortlisted : i === 2 ? drive.assessed : i === 3 ? drive.interviewed : drive.selected) > 0 && (
                            <CheckCircle size={10} />
                          )}
                          {stage}
                        </div>
                        {i < drive.stages.length - 1 && <ChevronRight size={12} className="text-[#E8ECF4] shrink-0" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {drive.status === 'active' && (
                  <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs text-blue-700 font-600">Drive active — Assessment phase in progress</span>
                    <button className="ml-auto text-xs font-600 text-blue-700 hover:underline">Manage Drive →</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Consolidated Placement Pipeline — All Drives</h3>
            <div className="space-y-3">
              {pipelineData.map((item) => (
                <div key={item.stage} className="flex items-center gap-4">
                  <span className="text-xs text-[#6B7A99] w-36 shrink-0">{item.stage}</span>
                  <div className="flex-1 h-3 bg-[#F4F6FA] rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(item.count / 1164) * 100}%` }} />
                  </div>
                  <span className="text-sm font-700 text-[#0D1B3E] w-12 text-right">{item.count}</span>
                  <span className="text-xs text-[#6B7A99] w-12 text-right">{((item.count / 1164) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Drives', value: '4', sub: '1 active', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Total Enrolled', value: '1,164', sub: 'Across all drives', color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Total Selected', value: '20', sub: '1.7% selection rate', color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Avg Package', value: '₹22.6L', sub: 'Completed drives', color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                  <TrendingUp size={16} className={item.color} />
                </div>
                <p className={`text-xl font-800 ${item.color}`}>{item.value}</p>
                <p className="text-xs text-[#0D1B3E] font-600 mt-0.5">{item.label}</p>
                <p className="text-[10px] text-[#6B7A99]">{item.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Company-wise Selection Rate</h3>
            <div className="space-y-3">
              {drives.filter(d => d.status === 'completed').map((drive) => {
                const rate = drive.enrolled > 0 ? ((drive.selected / drive.enrolled) * 100).toFixed(1) : '0';
                return (
                  <div key={drive.id} className="flex items-center gap-4">
                    <span className="text-xs font-600 text-[#0D1B3E] w-24 shrink-0">{drive.company}</span>
                    <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                    <span className="text-xs font-700 text-[#0D9488] w-16 text-right">{drive.selected}/{drive.enrolled}</span>
                    <span className="text-xs text-[#6B7A99] w-12 text-right">{rate}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
