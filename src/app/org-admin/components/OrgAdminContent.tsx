'use client';
import React, { useState } from 'react';
import { Briefcase, Users, TrendingUp, Plus, Search, Eye, Edit2, MoreHorizontal, CheckCircle, Clock, Calendar, Download } from 'lucide-react';

type Tab = 'dashboard' | 'jobs' | 'recruiters' | 'pipeline' | 'analytics';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'recruiters', label: 'Recruiters' },
  { id: 'pipeline', label: 'Hiring Pipeline' },
  { id: 'analytics', label: 'Analytics' },
];

const orgStats = [
  { label: 'Open Jobs', value: '42', change: '+8 this week', icon: <Briefcase size={18} />, color: 'bg-blue-50 text-blue-600' },
  { label: 'Active Candidates', value: '1,284', change: '+124 this week', icon: <Users size={18} />, color: 'bg-teal-50 text-teal-600' },
  { label: 'Interviews Scheduled', value: '87', change: '12 today', icon: <Calendar size={18} />, color: 'bg-violet-50 text-violet-600' },
  { label: 'Offers Extended', value: '23', change: '8 accepted', icon: <CheckCircle size={18} />, color: 'bg-green-50 text-green-600' },
  { label: 'Time to Hire', value: '18d', change: '-3d vs last month', icon: <Clock size={18} />, color: 'bg-amber-50 text-amber-600' },
  { label: 'Offer Accept Rate', value: '78%', change: '+4% vs last month', icon: <TrendingUp size={18} />, color: 'bg-rose-50 text-rose-600' },
];

const mockJobs = [
  { id: 1, title: 'Senior Software Engineer', dept: 'Engineering', location: 'Bangalore', type: 'Full-time', applications: 284, shortlisted: 42, status: 'active', posted: '2026-08-20', salary: '₹20-35L' },
  { id: 2, title: 'Product Manager', dept: 'Product', location: 'Mumbai', type: 'Full-time', applications: 156, shortlisted: 28, status: 'active', posted: '2026-08-18', salary: '₹25-40L' },
  { id: 3, title: 'Data Scientist', dept: 'Data', location: 'Hyderabad', type: 'Full-time', applications: 198, shortlisted: 35, status: 'active', posted: '2026-08-15', salary: '₹18-30L' },
  { id: 4, title: 'DevOps Engineer', dept: 'Engineering', location: 'Pune', type: 'Full-time', applications: 124, shortlisted: 18, status: 'paused', posted: '2026-08-10', salary: '₹15-25L' },
  { id: 5, title: 'UX Designer', dept: 'Design', location: 'Bangalore', type: 'Full-time', applications: 89, shortlisted: 14, status: 'active', posted: '2026-08-08', salary: '₹12-20L' },
];

const mockRecruiters = [
  { id: 1, name: 'Priya Mehta', email: 'priya@company.com', jobs: 8, interviews: 34, hires: 12, status: 'active' },
  { id: 2, name: 'Rahul Verma', email: 'rahul@company.com', jobs: 6, interviews: 28, hires: 9, status: 'active' },
  { id: 3, name: 'Sneha Patel', email: 'sneha@company.com', jobs: 5, interviews: 22, hires: 7, status: 'active' },
  { id: 4, name: 'Kiran Rao', email: 'kiran@company.com', jobs: 4, interviews: 18, hires: 5, status: 'inactive' },
];

const pipelineStages = [
  { stage: 'Applied', count: 1284, color: 'bg-blue-500', pct: 100 },
  { stage: 'Screening', count: 642, color: 'bg-violet-500', pct: 50 },
  { stage: 'Shortlisted', count: 284, color: 'bg-teal-500', pct: 22 },
  { stage: 'Assessment', count: 142, color: 'bg-amber-500', pct: 11 },
  { stage: 'AI Interview', count: 98, color: 'bg-orange-500', pct: 7.6 },
  { stage: 'Technical', count: 64, color: 'bg-rose-500', pct: 5 },
  { stage: 'HR Interview', count: 42, color: 'bg-pink-500', pct: 3.3 },
  { stage: 'Selected', count: 23, color: 'bg-green-500', pct: 1.8 },
];

function JobStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    closed: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function OrgAdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Briefcase size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Organization Admin</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Infosys — Manage recruitment, jobs, and hiring pipeline</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white"><Download size={14} /> Export</button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg"><Plus size={14} /> Post Job</button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={['px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'].join(' ')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {orgStats.map((stat) => (
              <div key={stat.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
                <p className="text-xl font-800 text-[#0D1B3E]">{stat.value}</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-[#0D9488] font-600 mt-1">{stat.change}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Hiring Funnel */}
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Hiring Funnel</h3>
              <div className="space-y-2">
                {pipelineStages.map((stage) => (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7A99] w-28 shrink-0">{stage.stage}</span>
                    <div className="flex-1 h-2.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                      <div className={`h-full ${stage.color} rounded-full`} style={{ width: `${stage.pct}%` }} />
                    </div>
                    <span className="text-xs font-700 text-[#0D1B3E] w-10 text-right">{stage.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recruiter Performance */}
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Recruiter Performance</h3>
              <div className="space-y-3">
                {mockRecruiters.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#0D9488] flex items-center justify-center text-xs font-700 text-white shrink-0">
                      {r.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-600 text-[#0D1B3E] truncate">{r.name}</p>
                      <p className="text-xs text-[#6B7A99]">{r.jobs} jobs · {r.interviews} interviews</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-700 text-green-600">{r.hires}</p>
                      <p className="text-[10px] text-[#6B7A99]">hires</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
              <input placeholder="Search jobs..." className="w-full pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg"><Plus size={14} /> Post Job</button>
          </div>
          <div className="space-y-3">
            {mockJobs.map((job) => (
              <div key={job.id} className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Briefcase size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-700 text-[#0D1B3E]">{job.title}</p>
                        <JobStatusBadge status={job.status} />
                      </div>
                      <p className="text-xs text-[#6B7A99] mt-0.5">{job.dept} · {job.location} · {job.type}</p>
                      <p className="text-xs font-600 text-[#0D9488] mt-0.5">{job.salary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-800 text-[#0D1B3E]">{job.applications}</p>
                      <p className="text-[10px] text-[#6B7A99]">Applied</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-800 text-[#0D9488]">{job.shortlisted}</p>
                      <p className="text-[10px] text-[#6B7A99]">Shortlisted</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors"><Eye size={14} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors"><Edit2 size={14} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors"><MoreHorizontal size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recruiters Tab */}
      {activeTab === 'recruiters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-700 text-[#0D1B3E]">Recruiter Management</h3>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg"><Plus size={14} /> Add Recruiter</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockRecruiters.map((r) => (
              <div key={r.id} className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#0D9488] flex items-center justify-center text-sm font-700 text-white">
                      {r.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-700 text-[#0D1B3E]">{r.name}</p>
                      <p className="text-xs text-[#6B7A99]">{r.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-600 ${r.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>{r.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: 'Jobs', value: r.jobs }, { label: 'Interviews', value: r.interviews }, { label: 'Hires', value: r.hires }].map((item) => (
                    <div key={item.label} className="text-center p-2 bg-[#F8FAFC] rounded-lg">
                      <p className="text-sm font-700 text-[#0D1B3E]">{item.value}</p>
                      <p className="text-[10px] text-[#6B7A99]">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button className="flex-1 py-1.5 text-xs font-600 text-[#0D9488] border border-[#0D9488]/30 rounded-lg hover:bg-teal-50 transition-colors">View Profile</button>
                  <button className="flex-1 py-1.5 text-xs font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors">Assign Jobs</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <h3 className="text-sm font-700 text-[#0D1B3E]">Recruitment Pipeline — All Jobs</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pipelineStages.map((stage) => (
              <div key={stage.stage} className="bg-white border border-[#E8ECF4] rounded-xl p-4 min-w-[160px] shrink-0">
                <div className={`w-2 h-2 rounded-full ${stage.color} mb-2`} />
                <p className="text-sm font-700 text-[#0D1B3E]">{stage.count}</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">{stage.stage}</p>
                <p className="text-[10px] text-[#0D9488] font-600 mt-1">{stage.pct.toFixed(1)}% of total</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Avg Time to Hire', value: '18 days', sub: '-3 days vs last month', color: 'text-blue-600' },
              { label: 'Cost per Hire', value: '₹42,000', sub: '-8% vs last month', color: 'text-green-600' },
              { label: 'Offer Accept Rate', value: '78%', sub: '+4% vs last month', color: 'text-teal-600' },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <p className={`text-2xl font-800 ${item.color}`}>{item.value}</p>
                <p className="text-sm font-600 text-[#0D1B3E] mt-1">{item.label}</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
