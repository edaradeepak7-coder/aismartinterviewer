'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase, Users, TrendingUp, Plus, Search, Eye, CheckCircle, Clock,
  Calendar, Download, Loader2, AlertCircle, RefreshCw, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { csrfHeaders } from '@/lib/api/apiClient';
import { toast } from 'sonner';

type Tab = 'dashboard' | 'jobs' | 'recruiters' | 'pipeline' | 'analytics';

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  is_active: boolean;
  applications_count: number | null;
  created_at: string;
  created_by?: string | null;
}

interface RecruiterRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  updated_at: string | null;
}

interface InterviewRow {
  id: string;
  status: string | null;
  recommendation: string | null;
  scheduled_at: string | null;
  created_at: string | null;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'recruiters', label: 'Recruiters' },
  { id: 'pipeline', label: 'Hiring Pipeline' },
  { id: 'analytics', label: 'Analytics' },
];

const PIPELINE_DEFS: { stage: string; color: string; match: (iv: InterviewRow) => boolean }[] = [
  { stage: 'Scheduled', color: 'bg-blue-500', match: (iv) => iv.status === 'scheduled' || iv.status === 'pending' },
  { stage: 'In Progress', color: 'bg-violet-500', match: (iv) => iv.status === 'in_progress' },
  { stage: 'Completed', color: 'bg-teal-500', match: (iv) => iv.status === 'completed' || iv.status === 'evaluated' },
  { stage: 'Recommended', color: 'bg-green-500', match: (iv) => iv.recommendation === 'yes' || iv.recommendation === 'strong_yes' },
  { stage: 'Rejected', color: 'bg-rose-500', match: (iv) => iv.recommendation === 'no' || iv.recommendation === 'strong_no' || iv.status === 'cancelled' },
];

function JobStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${
      active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      {active ? 'Active' : 'Paused'}
    </span>
  );
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return '—';
  const fmt = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(0)}L` : `₹${n.toLocaleString()}`);
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function formatEmploymentType(type: string | null): string {
  if (!type) return 'Full-time';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function OrgAdminContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [recruiters, setRecruiters] = useState<RecruiterRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [orgName, setOrgName] = useState('Organization');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jobSearch, setJobSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', department: '', location: '', employment_type: 'full_time',
  });

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const supabase = createClient();
      const [{ data: profile }, jobsRes, { data: recruiterRows }, { data: interviewRows }] = await Promise.all([
        supabase.from('user_profiles').select('full_name, company_name, role').eq('id', user.id).maybeSingle(),
        fetch('/api/job-postings'),
        supabase
          .from('user_profiles')
          .select('id, full_name, email, role, updated_at')
          .in('role', ['recruiter', 'org_admin'])
          .order('updated_at', { ascending: false })
          .limit(100),
        supabase
          .from('interviews')
          .select('id, status, recommendation, scheduled_at, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      setOrgName(profile?.company_name || profile?.full_name || 'Organization');

      if (!jobsRes.ok) {
        const err = await jobsRes.json().catch(() => ({}));
        throw new Error(err.error || `Jobs load failed (${jobsRes.status})`);
      }
      const jobsJson = await jobsRes.json();
      setJobs(Array.isArray(jobsJson.data) ? jobsJson.data : []);
      setRecruiters(recruiterRows || []);
      setInterviews(interviewRows || []);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load organization data');
      setJobs([]);
      setRecruiters([]);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openJobs = jobs.filter((j) => j.is_active).length;
  const scheduledInterviews = interviews.filter((iv) => {
    if (iv.status !== 'scheduled' && iv.status !== 'pending') return false;
    if (!iv.scheduled_at) return true;
    return new Date(iv.scheduled_at) >= new Date(new Date().toDateString());
  }).length;
  const offersExtended = interviews.filter((iv) =>
    iv.recommendation === 'yes' || iv.recommendation === 'strong_yes'
  ).length;
  const completedCount = interviews.filter((iv) =>
    iv.status === 'completed' || iv.status === 'evaluated'
  ).length;

  const pipelineStages = useMemo(() => {
    const total = Math.max(interviews.length, 1);
    return PIPELINE_DEFS.map((def) => {
      const count = interviews.filter(def.match).length;
      return { stage: def.stage, color: def.color, count, pct: Math.round((count / total) * 1000) / 10 };
    });
  }, [interviews]);

  const recruiterStats = useMemo(() => {
    return recruiters.map((r) => {
      const ownedJobs = jobs.filter((j) => j.created_by === r.id).length;
      return {
        ...r,
        jobs: ownedJobs,
        interviews: 0,
        hires: 0,
        status: (r.updated_at && Date.now() - new Date(r.updated_at).getTime() < 30 * 86400000) ? 'active' : 'inactive',
      };
    });
  }, [recruiters, jobs]);

  const filteredJobs = jobs.filter((j) => {
    const q = jobSearch.toLowerCase();
    return !q || j.title.toLowerCase().includes(q) || (j.department || '').toLowerCase().includes(q) || (j.location || '').toLowerCase().includes(q);
  });

  const handleCreateJob = async () => {
    if (!createForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/job-postings', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(createForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to create job');
      toast.success('Job posted');
      setShowCreate(false);
      setCreateForm({ title: '', department: '', location: '', employment_type: 'full_time' });
      await loadAll();
      setActiveTab('jobs');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create job');
    } finally {
      setCreating(false);
    }
  };

  const exportJobs = () => {
    const csv = [
      'Title,Department,Location,Type,Active,Applications,Created',
      ...jobs.map((j) =>
        `"${j.title}","${j.department || ''}","${j.location || ''}","${j.employment_type || ''}",${j.is_active},${j.applications_count ?? 0},"${j.created_at}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#6B7A99]">
        <Loader2 size={18} className="animate-spin" /> Loading organization…
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Briefcase size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Organization Admin</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">{orgName} — jobs, recruiters, and interview pipeline</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={exportJobs}
            disabled={jobs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white disabled:opacity-40"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg"
          >
            <Plus size={14} /> Post Job
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-600 text-amber-800">Could not load full data</p>
            <p className="text-xs text-amber-700 mt-0.5">{loadError}</p>
          </div>
        </div>
      )}

      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Open Jobs', value: openJobs, sub: `${jobs.length} total`, icon: <Briefcase size={18} />, color: 'bg-blue-50 text-blue-600' },
              { label: 'Recruiters', value: recruiters.length, sub: 'in org roles', icon: <Users size={18} />, color: 'bg-teal-50 text-teal-600' },
              { label: 'Interviews Scheduled', value: scheduledInterviews, sub: 'upcoming / pending', icon: <Calendar size={18} />, color: 'bg-violet-50 text-violet-600' },
              { label: 'Offers / Yes Recs', value: offersExtended, sub: 'from interviews', icon: <CheckCircle size={18} />, color: 'bg-green-50 text-green-600' },
              { label: 'Completed Interviews', value: completedCount, sub: 'evaluated or done', icon: <Clock size={18} />, color: 'bg-amber-50 text-amber-600' },
              { label: 'All Interviews', value: interviews.length, sub: 'in system', icon: <TrendingUp size={18} />, color: 'bg-rose-50 text-rose-600' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
                <p className="text-xl font-800 text-[#0D1B3E]">{stat.value}</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-[#0D9488] font-600 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Interview Pipeline</h3>
              {interviews.length === 0 ? (
                <p className="text-sm text-[#6B7A99]">No interviews yet. Pipeline fills as sessions are scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {pipelineStages.map((stage) => (
                    <div key={stage.stage} className="flex items-center gap-3">
                      <span className="text-xs text-[#6B7A99] w-28 shrink-0">{stage.stage}</span>
                      <div className="flex-1 h-2.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                        <div className={`h-full ${stage.color} rounded-full`} style={{ width: `${Math.min(stage.pct, 100)}%` }} />
                      </div>
                      <span className="text-xs font-700 text-[#0D1B3E] w-10 text-right">{stage.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Recruiter Activity</h3>
              {recruiterStats.length === 0 ? (
                <p className="text-sm text-[#6B7A99]">No recruiter or org_admin profiles found.</p>
              ) : (
                <div className="space-y-3">
                  {recruiterStats.slice(0, 6).map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-[#0D9488] flex items-center justify-center text-xs font-700 text-white shrink-0">
                        {(r.full_name || r.email || '?').split(/[\s@]/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-600 text-[#0D1B3E] truncate">{r.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-[#6B7A99]">{r.jobs} jobs posted · {r.role?.replace(/_/g, ' ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-700 text-[#0D1B3E]">{r.jobs}</p>
                        <p className="text-[10px] text-[#6B7A99]">jobs</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
              <input
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search jobs..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg"
            >
              <Plus size={14} /> Post Job
            </button>
          </div>
          {filteredJobs.length === 0 ? (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-10 text-center text-sm text-[#6B7A99]">
              No job postings yet. Post a role to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <div key={job.id} className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <Briefcase size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-700 text-[#0D1B3E]">{job.title}</p>
                          <JobStatusBadge active={job.is_active} />
                        </div>
                        <p className="text-xs text-[#6B7A99] mt-0.5">
                          {job.department || 'General'} · {job.location || '—'} · {formatEmploymentType(job.employment_type)}
                        </p>
                        <p className="text-xs font-600 text-[#0D9488] mt-0.5">{formatSalary(job.salary_min, job.salary_max)}</p>
                        <p className="text-[10px] text-[#9BA8C0] mt-1">Posted {fmtDate(job.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="text-lg font-800 text-[#0D1B3E]">{job.applications_count ?? 0}</p>
                        <p className="text-[10px] text-[#6B7A99]">Applications</p>
                      </div>
                      <Link
                        href="/jobs"
                        className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] hover:text-[#0D1B3E] transition-colors"
                        title="View public jobs board"
                      >
                        <Eye size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'recruiters' && (
        <div className="space-y-4">
          <h3 className="text-sm font-700 text-[#0D1B3E]">Recruiter Management</h3>
          {recruiterStats.length === 0 ? (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-10 text-center text-sm text-[#6B7A99]">
              No recruiter or org_admin accounts found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recruiterStats.map((r) => (
                <div key={r.id} className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-[#0D9488] flex items-center justify-center text-sm font-700 text-white">
                        {(r.full_name || r.email || '?').split(/[\s@]/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-700 text-[#0D1B3E]">{r.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-[#6B7A99]">{r.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-600 ${
                      r.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Jobs Posted', value: r.jobs },
                      { label: 'Role', value: (r.role || '—').replace(/_/g, ' ') },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-2 bg-[#F8FAFC] rounded-lg">
                        <p className="text-sm font-700 text-[#0D1B3E] capitalize">{item.value}</p>
                        <p className="text-[10px] text-[#6B7A99]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <h3 className="text-sm font-700 text-[#0D1B3E]">Interview Pipeline</h3>
          {interviews.length === 0 ? (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-10 text-center text-sm text-[#6B7A99]">
              No interview data yet.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {pipelineStages.map((stage) => (
                <div key={stage.stage} className="bg-white border border-[#E8ECF4] rounded-xl p-4 min-w-[160px] shrink-0">
                  <div className={`w-2 h-2 rounded-full ${stage.color} mb-2`} />
                  <p className="text-sm font-700 text-[#0D1B3E]">{stage.count}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5">{stage.stage}</p>
                  <p className="text-[10px] text-[#0D9488] font-600 mt-1">{stage.pct}% of interviews</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: 'Open Roles',
                value: String(openJobs),
                sub: `${jobs.length} postings total`,
                color: 'text-blue-600',
              },
              {
                label: 'Completion Rate',
                value: interviews.length
                  ? `${Math.round((completedCount / interviews.length) * 100)}%`
                  : '—',
                sub: `${completedCount} of ${interviews.length} interviews`,
                color: 'text-green-600',
              },
              {
                label: 'Positive Rec Rate',
                value: completedCount
                  ? `${Math.round((offersExtended / completedCount) * 100)}%`
                  : '—',
                sub: `${offersExtended} yes recommendations`,
                color: 'text-teal-600',
              },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-[#E8ECF4] rounded-xl p-5">
                <p className={`text-2xl font-800 ${item.color}`}>{item.value}</p>
                <p className="text-sm font-600 text-[#0D1B3E] mt-1">{item.label}</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
          {interviews.length === 0 && jobs.length === 0 && (
            <p className="text-sm text-[#6B7A99]">Analytics appear once jobs and interviews exist.</p>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-700 text-[#0D1B3E]">Post a Job</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-[#6B7A99] hover:text-[#0D1B3E]">
                <X size={16} />
              </button>
            </div>
            {[
              { key: 'title', label: 'Title', required: true },
              { key: 'department', label: 'Department' },
              { key: 'location', label: 'Location' },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs font-600 text-[#6B7A99]">{f.label}{f.required ? ' *' : ''}</label>
                <input
                  value={(createForm as any)[f.key]}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:border-[#0D9488]"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-600 text-[#6B7A99]">Employment type</label>
              <select
                value={createForm.employment_type}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, employment_type: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:border-[#0D9488]"
              >
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <button
              onClick={handleCreateJob}
              disabled={creating}
              className="w-full py-2.5 bg-[#0D9488] hover:bg-[#0B8076] text-white text-sm font-600 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              Create Job
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
