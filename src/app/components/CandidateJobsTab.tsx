'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Briefcase, MapPin, DollarSign, Search, Loader2, ChevronRight, Building2, Clock
} from 'lucide-react';

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  description: string | null;
  salary_min: number | null;
  salary_max: number | null;
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

export default function CandidateJobsTab() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    return !q || j.title.toLowerCase().includes(q) || (j.description || '').toLowerCase().includes(q) || (j.department || '').toLowerCase().includes(q);
  });

  const handleApply = (jobId: string) => {
    router.push(`/book-interview?job=${jobId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search roles, departments…"
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Briefcase size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-500 text-foreground">No open positions found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? 'Try a different search term' : 'Check back soon for new opportunities'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(job => (
            <div
              key={job.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all duration-150 group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-600 text-foreground truncate">{job.title}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building2 size={12} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      {job.user_profiles?.company_name || 'Meridian Technologies'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-3">
                {job.department && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Briefcase size={11} />
                    {job.department}
                  </div>
                )}
                {job.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={11} />
                    {job.location}
                  </div>
                )}
                {(job.salary_min || job.salary_max) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign size={11} />
                    {formatSalary(job.salary_min, job.salary_max)}
                  </div>
                )}
              </div>

              {job.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {job.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={11} />
                  {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <button
                  onClick={() => handleApply(job.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-xs font-600 rounded-lg hover:bg-primary/90 transition-colors"
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
