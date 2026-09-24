'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Target, Building2, Plus, Search, Briefcase, Calendar, Loader2, RefreshCw,
  X, Users, CheckCircle2, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { csrfHeaders } from '@/lib/api/apiClient';

type Tab = 'drives' | 'pipeline' | 'analytics';

interface Drive {
  id: string;
  company_name: string;
  role_title: string;
  location?: string | null;
  package_lpa_min?: number | null;
  package_lpa_max?: number | null;
  drive_date?: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  selected_count: number;
  enrollment_count?: number;
  stage_counts?: Record<string, number>;
  notes?: string | null;
  created_at: string;
}

interface Kpis {
  activeDrives: number;
  totalSelected: number;
  totalDrives: number;
  completedDrives: number;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'drives', label: 'Placement Drives' },
  { id: 'pipeline', label: 'Drive Pipeline' },
  { id: 'analytics', label: 'Analytics' },
];

const STAGES = [
  'registered',
  'shortlisted',
  'interviewing',
  'selected',
  'offered',
  'rejected',
] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

function CreateDriveModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [driveDate, setDriveDate] = useState('');
  const [minLpa, setMinLpa] = useState('');
  const [maxLpa, setMaxLpa] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('active');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!company.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/placement-drives', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          company_name: company.trim(),
          role_title: role.trim() || 'Open Role',
          location: location.trim() || undefined,
          drive_date: driveDate || undefined,
          package_lpa_min: minLpa ? Number(minLpa) : undefined,
          package_lpa_max: maxLpa ? Number(maxLpa) : undefined,
          status,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to create drive');
      toast.success('Drive created');
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not create drive');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-700 text-[#0D1B3E]">Create Placement Drive</h2>
          <button type="button" onClick={onClose} className="p-1 text-[#6B7A99] hover:text-[#0D1B3E]">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Company</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google"
              className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
            />
          </div>
          <div>
            <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. SDE Intern"
              className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Hyderabad"
                className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20"
              />
            </div>
            <div>
              <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Drive date</label>
              <input
                type="date"
                value={driveDate}
                onChange={(e) => setDriveDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Min LPA</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={minLpa}
                onChange={(e) => setMinLpa(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20"
              />
            </div>
            <div>
              <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Max LPA</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={maxLpa}
                onChange={(e) => setMaxLpa(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-700 text-[#6B7A99] mb-1 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}
              className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-600 border border-[#E8ECF4] rounded-xl text-[#6B7A99]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="flex-1 py-2.5 text-sm font-700 bg-[#0D9488] text-white rounded-xl hover:bg-[#0B8076] disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function EnrollModal({
  drive,
  onClose,
  onDone,
}: {
  drive: Drive;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<string>('registered');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() && !email.trim()) {
      toast.error('Name or email required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/placement-drives/${drive.id}`, {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          enroll: { candidate_name: name.trim(), candidate_email: email.trim(), stage },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to enroll');
      toast.success('Candidate enrolled');
      onDone();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not enroll');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-700 text-[#0D1B3E]">Enroll · {drive.company_name}</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Candidate name"
          className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg"
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-[#E8ECF4] rounded-xl text-sm font-600 text-[#6B7A99]">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="flex-1 py-2 bg-[#0D9488] text-white rounded-xl text-sm font-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Enroll'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlacementDrivesContent() {
  const [activeTab, setActiveTab] = useState<Tab>('drives');
  const [search, setSearch] = useState('');
  const [drives, setDrives] = useState<Drive[]>([]);
  const [kpis, setKpis] = useState<Kpis>({
    activeDrives: 0,
    totalSelected: 0,
    totalDrives: 0,
    completedDrives: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [enrollDrive, setEnrollDrive] = useState<Drive | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/placement-drives');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to load drives');
      setDrives((json.data || []) as Drive[]);
      setKpis(
        json.kpis || {
          activeDrives: 0,
          totalSelected: 0,
          totalDrives: 0,
          completedDrives: 0,
        },
      );
    } catch (err: unknown) {
      setDrives([]);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = drives.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.company_name.toLowerCase().includes(q) ||
      d.role_title.toLowerCase().includes(q) ||
      (d.location || '').toLowerCase().includes(q)
    );
  });

  const pipelineTotals: Record<string, number> = {};
  for (const s of STAGES) pipelineTotals[s] = 0;
  for (const d of drives) {
    for (const [stage, count] of Object.entries(d.stage_counts || {})) {
      pipelineTotals[stage] = (pipelineTotals[stage] || 0) + count;
    }
  }
  const totalEnrolled = Object.values(pipelineTotals).reduce((a, b) => a + b, 0);
  const selectedOrOffered = (pipelineTotals.selected || 0) + (pipelineTotals.offered || 0);
  const selectionRate = totalEnrolled
    ? Math.round((selectedOrOffered / totalEnrolled) * 100)
    : 0;

  const packages = drives
    .flatMap((d) => [d.package_lpa_min, d.package_lpa_max].filter((n): n is number => typeof n === 'number' && n > 0));
  const avgPackage = packages.length
    ? Math.round((packages.reduce((a, b) => a + b, 0) / packages.length) * 10) / 10
    : 0;

  const setStatus = async (drive: Drive, status: Drive['status']) => {
    try {
      const res = await fetch(`/api/placement-drives/${drive.id}`, {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      toast.success(`Marked ${status}`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Target size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Placement Drives</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">
              Campus drives, pipeline stages, and selection analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <div>
              <p className="text-base font-800 text-blue-600">{loading ? '—' : kpis.activeDrives}</p>
              <p className="text-[10px] text-[#6B7A99]">Active Drives</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <div>
              <p className="text-base font-800 text-green-600">{loading ? '—' : kpis.totalSelected}</p>
              <p className="text-[10px] text-[#6B7A99]">Total Selected</p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 border border-[#E8ECF4] rounded-lg text-[#6B7A99] hover:bg-[#F4F6FA]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors"
          >
            <Plus size={14} /> Create Drive
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-0 border-b border-[#E8ECF4]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id
                ? 'border-[#0D9488] text-[#0D9488]'
                : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'drives' && (
        <div className="space-y-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drives..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#6B7A99] gap-2 text-sm">
              <Loader2 size={18} className="animate-spin" /> Loading drives…
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-[#E8ECF4] rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mx-auto">
                <Building2 size={22} className="text-violet-600" />
              </div>
              <h2 className="text-base font-700 text-[#0D1B3E]">No placement drives yet</h2>
              <p className="text-sm text-[#6B7A99] max-w-md mx-auto">
                Create a drive to track campus hiring, enroll candidates, and measure selection rates.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-600 bg-[#0D9488] text-white rounded-lg"
              >
                <Plus size={14} /> Create Drive
              </button>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-600 text-[#0D9488] border border-[#0D9488]/30 rounded-lg hover:bg-teal-50"
                >
                  <Briefcase size={13} /> Open jobs board
                </Link>
                <Link
                  href="/interview-calendar"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA]"
                >
                  <Calendar size={13} /> Interview calendar
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((d) => (
                <div
                  key={d.id}
                  className="bg-white border border-[#E8ECF4] rounded-xl p-5 hover:shadow-sm transition-shadow space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-700 text-[#0D1B3E]">{d.company_name}</p>
                      <p className="text-xs text-[#6B7A99]">{d.role_title}</p>
                    </div>
                    <span
                      className={`text-[10px] font-600 px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[d.status]}`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#6B7A99]">
                    {d.location && <span>{d.location}</span>}
                    {d.drive_date && <span>{d.drive_date}</span>}
                    {(d.package_lpa_min || d.package_lpa_max) && (
                      <span>
                        {d.package_lpa_min ?? '—'}–{d.package_lpa_max ?? '—'} LPA
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-[#F8FAFC] rounded-lg py-2">
                      <p className="text-sm font-800 text-[#0D1B3E]">{d.enrollment_count || 0}</p>
                      <p className="text-[10px] text-[#6B7A99]">Enrolled</p>
                    </div>
                    <div className="bg-[#F8FAFC] rounded-lg py-2">
                      <p className="text-sm font-800 text-emerald-600">{d.selected_count || 0}</p>
                      <p className="text-[10px] text-[#6B7A99]">Selected</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEnrollDrive(d)}
                      className="flex-1 text-xs font-600 py-2 bg-[#0D9488] text-white rounded-lg"
                    >
                      Enroll
                    </button>
                    {d.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => setStatus(d, 'completed')}
                        className="px-3 text-xs font-600 py-2 border border-[#E8ECF4] rounded-lg text-[#6B7A99]"
                      >
                        Complete
                      </button>
                    ) : d.status === 'draft' ? (
                      <button
                        type="button"
                        onClick={() => setStatus(d, 'active')}
                        className="px-3 text-xs font-600 py-2 border border-[#E8ECF4] rounded-lg text-[#6B7A99]"
                      >
                        Activate
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {totalEnrolled === 0 ? (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-10 text-center">
              <p className="text-sm font-600 text-[#0D1B3E]">Pipeline empty</p>
              <p className="text-xs text-[#6B7A99] mt-1">
                Enroll candidates on a drive to populate stage counts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {STAGES.map((s) => (
                <div key={s} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-2">
                    <Users size={14} />
                  </div>
                  <p className="text-xl font-800 text-[#0D1B3E]">{pipelineTotals[s] || 0}</p>
                  <p className="text-xs text-[#6B7A99] capitalize">{s}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 size={16} />
            </div>
            <p className="text-2xl font-800 text-[#0D1B3E]">{selectionRate}%</p>
            <p className="text-xs text-[#6B7A99]">Selection rate (selected + offered)</p>
          </div>
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
              <TrendingUp size={16} />
            </div>
            <p className="text-2xl font-800 text-[#0D1B3E]">{avgPackage || '—'}</p>
            <p className="text-xs text-[#6B7A99]">Avg package (LPA) from drive ranges</p>
          </div>
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Target size={16} />
            </div>
            <p className="text-2xl font-800 text-[#0D1B3E]">{kpis.completedDrives}</p>
            <p className="text-xs text-[#6B7A99]">Completed drives</p>
          </div>
        </div>
      )}

      {showCreate && <CreateDriveModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {enrollDrive && (
        <EnrollModal drive={enrollDrive} onClose={() => setEnrollDrive(null)} onDone={load} />
      )}
    </div>
  );
}
