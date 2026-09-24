'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Briefcase, MapPin, Clock, DollarSign, Search, Loader2, ChevronRight, Building2, Filter
} from 'lucide-react';

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  description: string | null;
  requirements: string | null;
  salary_min: number | null;
  salary_max: number | null;
  is_active: boolean;
  applications_count: number | null;
  created_at: string;
  user_profiles?: { full_name: string; company_name: string | null } | null;
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return '';
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function formatEmploymentType(type: string | null): string {
  if (!type) return '';
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function JobsContent() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState<'all' | 'full_time' | 'part_time' | 'contract'>('all');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('job_postings')
      .select('*, user_profiles(full_name, company_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('jobs fetch:', error.message);
        setJobs(data || []);
        setLoading(false);
      });
  }, []);

  const departments = Array.from(new Set(jobs.map(j => j.department).filter(Boolean))) as string[];

  const normalizeEmployment = (type: string | null) =>
    (type || '').toLowerCase().replace(/[\s-]+/g, '_');

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title.toLowerCase().includes(q) || (j.description || '').toLowerCase().includes(q) || (j.department || '').toLowerCase().includes(q);
    const matchDept = !deptFilter || j.department === deptFilter;
    const emp = normalizeEmployment(j.employment_type);
    const matchEmp =
      employmentFilter === 'all' ||
      emp === employmentFilter ||
      (employmentFilter === 'full_time' && (emp === 'fulltime' || emp === 'full_time')) ||
      (employmentFilter === 'part_time' && (emp === 'parttime' || emp === 'part_time')) ||
      (employmentFilter === 'contract' && (emp === 'contract' || emp === 'contractor'));
    return matchSearch && matchDept && matchEmp;
  });

  const handleApply = (jobId: string) => {
    router.push(`/book-interview?job=${jobId}`);
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <Briefcase size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Open Positions</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Browse available roles and apply by booking an interview slot</p>
          </div>
        </div>

        {/* Stat pill */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Briefcase size={16} className="text-[#0D9488]" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">{filtered.length}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">{filtered.length === 1 ? 'Role' : 'Roles'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav — filters by employment_type */}
      <div className="flex gap-0 border-b border-[#E8ECF4]">
        {([
          { id: 'all' as const, label: 'All Roles' },
          { id: 'full_time' as const, label: 'Full-time' },
          { id: 'part_time' as const, label: 'Part-time' },
          { id: 'contract' as const, label: 'Contract' },
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setEmploymentFilter(tab.id)}
            className={[
              'px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px',
              employmentFilter === tab.id
                ? 'border-[#0D9488] text-[#0D9488]'
                : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search roles, departments…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] placeholder:text-[#6B7A99] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
          />
        </div>
        {departments.length > 0 && (
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-[#E8ECF4] rounded-xl text-sm text-[#0D1B3E] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors appearance-none min-w-[160px]"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#0D9488]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F4F6FA] flex items-center justify-center mb-3">
            <Briefcase size={22} className="text-[#6B7A99]" />
          </div>
          <p className="text-sm font-500 text-[#0D1B3E]">No open positions found</p>
          <p className="text-xs text-[#6B7A99] mt-1">
            {search || deptFilter ? 'Try adjusting your filters' : 'Check back soon for new opportunities'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(job => (
            <div
              key={job.id}
              className="bg-white border border-[#E8ECF4] rounded-2xl p-5 hover:border-[#0D9488]/40 hover:shadow-sm transition-all duration-150 group"
            >
              {/* Job header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-700 text-[#0D1B3E] truncate">{job.title}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building2 size={12} className="text-[#6B7A99] shrink-0" />
                    <span className="text-xs text-[#6B7A99] truncate">
                      {job.user_profiles?.company_name?.trim() || 'Company not listed'}
                    </span>
                  </div>
                </div>
                {job.employment_type && (
                  <span className="text-[11px] font-600 bg-[#E8F4F8] text-[#0D9488] px-2 py-0.5 rounded-full shrink-0">
                    {formatEmploymentType(job.employment_type)}
                  </span>
                )}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-3 mb-3">
                {job.department && (
                  <div className="flex items-center gap-1 text-xs text-[#6B7A99]">
                    <Briefcase size={11} />
                    {job.department}
                  </div>
                )}
                {job.location && (
                  <div className="flex items-center gap-1 text-xs text-[#6B7A99]">
                    <MapPin size={11} />
                    {job.location}
                  </div>
                )}
                {(job.salary_min || job.salary_max) && (
                  <div className="flex items-center gap-1 text-xs text-[#6B7A99]">
                    <DollarSign size={11} />
                    {formatSalary(job.salary_min, job.salary_max)}
                  </div>
                )}
              </div>

              {/* Description */}
              {job.description && (
                <p className="text-sm text-[#6B7A99] line-clamp-2 mb-4">
                  {job.description}
                </p>
              )}

              {/* Requirements preview */}
              {job.requirements && (
                <p className="text-xs text-[#6B7A99]/80 line-clamp-1 mb-4 italic">
                  Requirements: {job.requirements}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E8ECF4]">
                <div className="flex items-center gap-3 text-xs text-[#6B7A99]">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span>{job.applications_count ?? 0} applicant{(job.applications_count ?? 0) === 1 ? '' : 's'}</span>
                </div>
                <button
                  onClick={() => handleApply(job.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0D9488] hover:bg-[#0B8076] text-white text-xs font-700 rounded-xl transition-colors"
                >
                  Apply
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
