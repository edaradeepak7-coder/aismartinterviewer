'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User, Star, MessageSquare, Activity, Mail, Edit2, ClipboardCheck,
  Loader2, AlertCircle, Calendar, Gift, ArrowLeft, Bookmark, Building2,
  Clock, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { csrfHeaders } from '@/lib/api/apiClient';

type Tab = 'profile' | 'interviews' | 'offers' | 'notes' | 'feedback' | 'activity';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={14} /> },
  { id: 'interviews', label: 'Interviews', icon: <Star size={14} /> },
  { id: 'offers', label: 'Offers', icon: <Gift size={14} /> },
  { id: 'notes', label: 'Notes', icon: <MessageSquare size={14} /> },
  { id: 'feedback', label: 'Feedback', icon: <ClipboardCheck size={14} /> },
  { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
];

type Candidate360Payload = {
  candidate: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string | null;
    experience_level: string | null;
    avatar_initials: string | null;
    created_at: string;
  };
  meta: { bookmarked: boolean; tags: string[]; updated_at: string | null };
  interviews: Array<{
    id: string;
    role: string;
    company: string | null;
    interview_type: string;
    status: string;
    scheduled_at: string;
    completed_at: string | null;
    duration_minutes: number | null;
    overall_score: number | null;
    recommendation: string | null;
    recruiter_notes: string | null;
  }>;
  offers: Array<{
    id: string;
    role: string;
    company: string;
    salary_range: string | null;
    status: string;
    created_at: string;
    responded_at: string | null;
  }>;
  feedback: Array<{
    id: string;
    strengths: string;
    gaps: string;
    recommendation_notes: string;
    overall_recommendation: string | null;
    created_at: string;
  }>;
  notes: Array<{
    id: string;
    interview_id: string;
    role: string;
    company: string | null;
    content: string;
    date: string;
    source: string;
  }>;
  activity: Array<{
    id: string;
    action: string;
    detail: string;
    time: string;
    type: string;
  }>;
  stats: {
    interviewCount: number;
    completedCount: number;
    offerCount: number;
    avgScore: number | null;
    latestStatus: string | null;
  };
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-amber-50 text-amber-700',
    completed: 'bg-emerald-50 text-emerald-700',
    evaluated: 'bg-teal-50 text-teal-700',
    archived: 'bg-gray-50 text-gray-600',
    pending: 'bg-amber-50 text-amber-700',
    accepted: 'bg-emerald-50 text-emerald-700',
    declined: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-600 capitalize ${map[status] || 'bg-gray-50 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function Candidate360Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id') || '';

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Candidate360Payload | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', department: '', experience_level: '' });

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError(null);
      setPayload(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Could not load candidate');
        setPayload(null);
      } else {
        setPayload(json.data);
        const c = json.data.candidate;
        setEditForm({
          name: c.name || '',
          email: c.email || '',
          role: c.role || '',
          department: c.department || '',
          experience_level: c.experience_level || '',
        });
      }
    } catch {
      setError('Could not load candidate');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const initials = useMemo(() => {
    const name = payload?.candidate.name || '';
    return (
      payload?.candidate.avatar_initials ||
      name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() ||
      '?'
    );
  }, [payload]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(editForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'Could not save');
      } else {
        toast.success('Profile updated');
        setEditing(false);
        await load();
      }
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <User size={40} className="text-[#6B7A99]/40 mb-3" />
        <p className="text-sm font-700 text-[#0D1B3E]">Select a candidate</p>
        <p className="text-xs text-[#6B7A99] mt-1 max-w-sm">
          Open Candidate 360 from the recruiter dashboard, or pass a candidate id in the URL.
        </p>
        <Link
          href="/recruiter-dashboard"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-600 bg-[#0D9488] text-white rounded-lg hover:bg-[#0B8076]"
        >
          <ArrowLeft size={14} /> Recruiter dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="animate-spin text-[#0D9488]" />
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <AlertCircle size={40} className="text-red-400 mb-3" />
        <p className="text-sm font-700 text-[#0D1B3E]">{error || 'Candidate not found'}</p>
        <button
          type="button"
          onClick={() => router.push('/recruiter-dashboard')}
          className="mt-4 text-sm text-[#0D9488] hover:underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const { candidate, meta, interviews, offers, feedback, notes, activity, stats } = payload;

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#0D9488] flex items-center justify-center text-xl font-800 text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-800 text-[#0D1B3E]">{candidate.name}</h2>
                  {meta.bookmarked && (
                    <Bookmark size={16} className="text-amber-500 fill-amber-500" />
                  )}
                </div>
                <p className="text-sm text-[#6B7A99] mt-0.5">
                  {candidate.role || '—'}
                  {candidate.experience_level ? ` · ${candidate.experience_level}` : ''}
                  {candidate.department ? ` · ${candidate.department}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <a
                    href={`mailto:${candidate.email}`}
                    className="flex items-center gap-1 text-xs text-[#6B7A99] hover:text-[#0D9488]"
                  >
                    <Mail size={12} />
                    {candidate.email}
                  </a>
                  {stats.latestStatus && <StatusBadge status={stats.latestStatus} />}
                </div>
                {meta.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {meta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full font-500 border border-violet-100"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Link
                  href="/invitations"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 text-[#0D9488] border border-[#0D9488]/30 rounded-lg hover:bg-teal-50"
                >
                  <Calendar size={14} /> Invite
                </Link>
                <Link
                  href={`/recruiter-structured-feedback?candidateId=${candidate.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-lg"
                >
                  <ClipboardCheck size={14} /> Feedback
                </Link>
                <Link
                  href="/job-offers"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA]"
                >
                  <Gift size={14} /> Offers
                </Link>
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg"
                >
                  <Edit2 size={14} /> {editing ? 'Cancel' : 'Edit'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-[#F4F6FA]">
          <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-4 py-2.5">
            <Star size={15} className="text-amber-500" />
            <div>
              <p className="text-sm font-800 text-[#0D1B3E]">
                {stats.avgScore != null ? `${stats.avgScore}` : '—'}
              </p>
              <p className="text-[10px] text-[#6B7A99]">Avg score</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-4 py-2.5">
            <Calendar size={15} className="text-[#0D9488]" />
            <div>
              <p className="text-sm font-800 text-[#0D1B3E]">{stats.interviewCount}</p>
              <p className="text-[10px] text-[#6B7A99]">Interviews</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-4 py-2.5">
            <Gift size={15} className="text-emerald-600" />
            <div>
              <p className="text-sm font-800 text-[#0D1B3E]">{stats.offerCount}</p>
              <p className="text-[10px] text-[#6B7A99]">Offers</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-4 py-2.5">
            <Clock size={15} className="text-blue-600" />
            <div>
              <p className="text-sm font-800 text-[#0D1B3E]">{stats.completedCount}</p>
              <p className="text-[10px] text-[#6B7A99]">Completed</p>
            </div>
          </div>
        </div>

        {editing && (
          <div className="mt-5 pt-5 border-t border-[#F4F6FA] grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['name', 'email', 'role', 'department', 'experience_level'] as const).map((key) => (
              <div key={key}>
                <label className="text-[11px] font-600 text-[#6B7A99] uppercase tracking-wide">
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  value={editForm[key]}
                  onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="mt-1 w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0D9488]"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#0D9488] text-white text-sm font-600 rounded-lg hover:bg-[#0B8076] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-[#F4F6FA] rounded-xl w-fit flex-wrap">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-600 transition-all ${
              activeTab === tab.id
                ? 'bg-white text-[#0D1B3E] shadow-sm'
                : 'text-[#6B7A99] hover:text-[#0D1B3E]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 min-h-[240px]">
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h3 className="text-sm font-700 text-[#0D1B3E]">Profile</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[11px] text-[#6B7A99] uppercase font-600">Email</dt>
                <dd className="text-[#0D1B3E] mt-0.5">{candidate.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#6B7A99] uppercase font-600">Role</dt>
                <dd className="text-[#0D1B3E] mt-0.5">{candidate.role || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#6B7A99] uppercase font-600">Department</dt>
                <dd className="text-[#0D1B3E] mt-0.5">{candidate.department || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#6B7A99] uppercase font-600">Experience</dt>
                <dd className="text-[#0D1B3E] mt-0.5">{candidate.experience_level || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#6B7A99] uppercase font-600">Added</dt>
                <dd className="text-[#0D1B3E] mt-0.5">{formatWhen(candidate.created_at)}</dd>
              </div>
            </dl>
            <p className="text-xs text-[#6B7A99]">
              Resume / ATS / assessment tabs stay hidden until those data sources are wired.
            </p>
          </div>
        )}

        {activeTab === 'interviews' && (
          <div className="space-y-3">
            <h3 className="text-sm font-700 text-[#0D1B3E]">Interviews ({interviews.length})</h3>
            {interviews.length === 0 ? (
              <p className="text-sm text-[#6B7A99]">No interviews yet.</p>
            ) : (
              interviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/interview-results?id=${iv.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[#E8ECF4] hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0D9488]/10 flex items-center justify-center shrink-0">
                    <Star size={16} className="text-[#0D9488]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 text-[#0D1B3E] truncate">
                      {iv.role}
                      {iv.company ? ` · ${iv.company}` : ''}
                    </p>
                    <p className="text-xs text-[#6B7A99] mt-0.5">
                      {formatWhen(iv.scheduled_at)}
                      {iv.overall_score != null ? ` · Score ${iv.overall_score}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={iv.status} />
                  <ChevronRight size={14} className="text-[#6B7A99]" />
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="space-y-3">
            <h3 className="text-sm font-700 text-[#0D1B3E]">Offers ({offers.length})</h3>
            {offers.length === 0 ? (
              <p className="text-sm text-[#6B7A99]">No offers yet.</p>
            ) : (
              offers.map((o) => (
                <Link
                  key={o.id}
                  href={`/offer-status/${o.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[#E8ECF4] hover:bg-[#F8FAFC]"
                >
                  <Gift size={16} className="text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 text-[#0D1B3E]">
                      {o.role} · {o.company}
                    </p>
                    <p className="text-xs text-[#6B7A99]">
                      {o.salary_range || 'Compensation TBD'} · {formatWhen(o.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <h3 className="text-sm font-700 text-[#0D1B3E]">Private notes ({notes.length})</h3>
            {notes.length === 0 ? (
              <p className="text-sm text-[#6B7A99]">
                Notes from live interviews appear here after recruiters save them.
              </p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-3 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-600 text-[#0D9488]">
                      {n.role}
                      {n.company ? ` · ${n.company}` : ''}
                    </p>
                    <p className="text-[11px] text-[#6B7A99]">{formatWhen(n.date)}</p>
                  </div>
                  <p className="text-sm text-[#0D1B3E] whitespace-pre-wrap">{n.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-3">
            <h3 className="text-sm font-700 text-[#0D1B3E]">Structured feedback ({feedback.length})</h3>
            {feedback.length === 0 ? (
              <p className="text-sm text-[#6B7A99]">No structured feedback yet.</p>
            ) : (
              feedback.map((f) => (
                <div key={f.id} className="p-3 rounded-xl border border-[#E8ECF4]">
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge status={f.overall_recommendation || 'pending'} />
                    <span className="text-[11px] text-[#6B7A99]">{formatWhen(f.created_at)}</span>
                  </div>
                  {f.strengths && (
                    <p className="text-sm text-[#0D1B3E]">
                      <span className="font-600">Strengths: </span>
                      {f.strengths}
                    </p>
                  )}
                  {f.gaps && (
                    <p className="text-sm text-[#0D1B3E] mt-1">
                      <span className="font-600">Gaps: </span>
                      {f.gaps}
                    </p>
                  )}
                  {f.recommendation_notes && (
                    <p className="text-xs text-[#6B7A99] mt-2">{f.recommendation_notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-2">
            <h3 className="text-sm font-700 text-[#0D1B3E]">Activity</h3>
            {activity.length === 0 ? (
              <p className="text-sm text-[#6B7A99]">No activity yet.</p>
            ) : (
              activity.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 py-2 border-b border-[#F4F6FA] last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F4F6FA] flex items-center justify-center shrink-0 mt-0.5">
                    {a.type === 'offer' ? (
                      <Gift size={14} className="text-emerald-600" />
                    ) : a.type === 'feedback' ? (
                      <ClipboardCheck size={14} className="text-[#0D9488]" />
                    ) : (
                      <Building2 size={14} className="text-[#6B7A99]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 text-[#0D1B3E]">{a.action}</p>
                    <p className="text-xs text-[#6B7A99]">{a.detail}</p>
                  </div>
                  <span className="text-[11px] text-[#6B7A99] shrink-0">{formatWhen(a.time)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
