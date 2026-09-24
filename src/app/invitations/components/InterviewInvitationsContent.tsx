'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2, Clock, ChevronRight, CheckCircle2, XCircle, Calendar, Tag,
  AlertCircle, Inbox, Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { candidateService, interviewService, DBInterview } from '@/lib/services/interviewService';
import { bookingService, DBInterviewBooking } from '@/lib/services/offerService';
import { saveInterviewSessionConfig } from '@/lib/interview/sessionConfig';
import { csrfHeaders } from '@/lib/api/apiClient';
import { toast } from 'sonner';

interface InterviewInvitation {
  id: string;
  source: 'interview' | 'booking';
  interviewId?: string;
  company: string;
  companyInitials: string;
  role: string;
  department: string;
  interviewType: 'Technical' | 'Behavioral' | 'Mixed';
  duration: number;
  scheduledWindow: string;
  expiresAt: string;
  skillsAssessed: string[];
  instructions: string;
  status: 'pending' | 'accepted' | 'declined';
  urgency: 'high' | 'normal';
}

const typeColors: Record<string, string> = {
  Technical: 'bg-info-bg text-info border border-info-border',
  Behavioral: 'bg-primary/10 text-primary border border-primary/20',
  Mixed: 'bg-warning-bg text-warning border border-warning-border',
};

type FilterTab = 'all' | 'pending' | 'accepted' | 'declined';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '??';
}

function formatType(t?: string): 'Technical' | 'Behavioral' | 'Mixed' {
  const v = (t || 'technical').toLowerCase();
  if (v === 'behavioral') return 'Behavioral';
  if (v === 'mixed') return 'Mixed';
  return 'Technical';
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'TBD';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function mapInterview(i: DBInterview): InterviewInvitation {
  const status: InterviewInvitation['status'] =
    i.status === 'archived'
      ? 'declined'
      : i.candidate_confirmed || i.status === 'in_progress' || i.status === 'completed' || i.status === 'evaluated'
        ? 'accepted'
        : 'pending';

  const scheduled = i.scheduled_at ? new Date(i.scheduled_at) : null;
  const expires = scheduled ? new Date(scheduled.getTime() - 24 * 60 * 60 * 1000) : null;
  const soon = expires ? expires.getTime() - Date.now() < 48 * 60 * 60 * 1000 : false;

  return {
    id: i.id,
    source: 'interview',
    interviewId: i.id,
    company: i.company || 'Company',
    companyInitials: initials(i.company || 'CO'),
    role: i.role || 'Interview',
    department: i.department || 'General',
    interviewType: formatType(i.interview_type),
    duration: i.duration_minutes || 45,
    scheduledWindow: formatDate(i.scheduled_at),
    expiresAt: expires ? formatDate(expires.toISOString()) : '—',
    skillsAssessed: [formatType(i.interview_type), i.role].filter(Boolean) as string[],
    instructions: `Voice-based ${formatType(i.interview_type).toLowerCase()} interview for ${i.role}. Have a quiet environment ready.`,
    status,
    urgency: soon && status === 'pending' ? 'high' : 'normal',
  };
}

function mapBooking(b: DBInterviewBooking): InterviewInvitation | null {
  if (b.interview_id) return null; // shown via interview row
  const slot = b.recruiter_availability;
  const recruiter = slot?.user_profiles?.full_name || 'Recruiter';
  const company = 'Interview Booking';
  const when = slot
    ? `${slot.slot_date} · ${String(slot.start_time).slice(0, 5)}–${String(slot.end_time).slice(0, 5)}`
    : formatDate(b.created_at);
  const status: InterviewInvitation['status'] = b.confirmed ? 'accepted' : 'pending';

  return {
    id: b.id,
    source: 'booking',
    interviewId: b.interview_id || undefined,
    company,
    companyInitials: initials(recruiter),
    role: `Slot with ${recruiter}`,
    department: 'Scheduling',
    interviewType: 'Mixed',
    duration: slot?.duration_minutes || 45,
    scheduledWindow: when,
    expiresAt: slot?.slot_date || '—',
    skillsAssessed: ['Interview'],
    instructions: b.notes || 'Confirm this booking to proceed with your interview setup.',
    status,
    urgency: 'normal',
  };
}

export default function InterviewInvitationsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [invitations, setInvitations] = useState<InterviewInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const candidate = await candidateService.getByUserId(user.id);
      if (!candidate) {
        setInvitations([]);
        return;
      }

      const [interviews, bookings] = await Promise.all([
        interviewService.getByCandidateId(candidate.id),
        bookingService.getByCandidateId(candidate.id),
      ]);

      const fromInterviews = interviews
        .filter((i) => ['scheduled', 'in_progress', 'archived'].includes(i.status))
        .map(mapInterview);

      const fromBookings = bookings
        .map(mapBooking)
        .filter((x): x is InterviewInvitation => Boolean(x));

      const merged = [...fromInterviews, ...fromBookings];
      setInvitations(merged);
      setExpandedId(merged[0]?.id ?? null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load invitations');
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: invitations.length },
    { key: 'pending', label: 'Pending', count: invitations.filter(i => i.status === 'pending').length },
    { key: 'accepted', label: 'Accepted', count: invitations.filter(i => i.status === 'accepted').length },
    { key: 'declined', label: 'Declined', count: invitations.filter(i => i.status === 'declined').length },
  ];

  const filtered = activeTab === 'all' ? invitations : invitations.filter(i => i.status === activeTab);

  const prepareSession = (inv: InterviewInvitation) => {
    const duration = ([20, 30, 45, 60].includes(inv.duration) ? inv.duration : 45) as 20 | 30 | 45 | 60;
    saveInterviewSessionConfig({
      durationMinutes: duration,
      role: inv.role,
      company: inv.company,
      subjectName: inv.interviewType,
    });
    if (inv.interviewId) {
      try { sessionStorage.setItem('active_interview_id', inv.interviewId); } catch { /* ignore */ }
    }
  };

  const handleAccept = async (inv: InterviewInvitation, goToSetup = true) => {
    setActingId(inv.id);
    try {
      if (inv.source === 'interview') {
        const res = await fetch(`/api/interviews/${inv.id}`, {
          method: 'PATCH',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ candidate_confirmed: true }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to accept invitation');
        prepareSession(inv);
        setInvitations((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: 'accepted' } : i)));
        toast.success('Invitation accepted — continue to setup');
      } else {
        const res = await fetch(`/api/bookings/${inv.id}`, {
          method: 'PATCH',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ confirmed: true }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to confirm booking');
        setInvitations((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: 'accepted' } : i)));
        prepareSession(inv);
        toast.success('Booking confirmed');
      }
      if (goToSetup) router.push('/interview-setup');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Accept failed');
    } finally {
      setActingId(null);
    }
  };

  const handleDecline = async (inv: InterviewInvitation) => {
    setActingId(inv.id);
    try {
      if (inv.source === 'interview') {
        const res = await fetch(`/api/interviews/${inv.id}`, {
          method: 'PATCH',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ status: 'archived' }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to decline');
      } else {
        const res = await fetch(`/api/bookings/${inv.id}`, {
          method: 'DELETE',
          headers: csrfHeaders(),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to decline booking');
      }
      setInvitations(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'declined' } : i));
      toast.success('Invitation declined');
    } catch (err: any) {
      toast.error(err.message || 'Decline failed');
    } finally {
      setActingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" /> Loading invitations…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-600 text-foreground">Interview Invitations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review and respond to scheduled interviews and booking requests.
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-500 border-b-2 -mb-px transition-colors duration-150',
              activeTab === tab.key
                ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={[
                'text-[11px] font-600 rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none',
                activeTab === tab.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
              ].join(' ')}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Inbox size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-500 text-foreground">No invitations here</p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeTab === 'pending' ? 'You have no pending invitations.' : `No ${activeTab} invitations found.`}
          </p>
          <Link href="/book-interview" className="mt-4 text-sm text-primary hover:underline font-500">
            Book an interview slot
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => {
            const isExpanded = expandedId === inv.id;
            const isPending = inv.status === 'pending';
            const isAccepted = inv.status === 'accepted';
            const isDeclined = inv.status === 'declined';
            const busy = actingId === inv.id;

            return (
              <div
                key={inv.id}
                className={[
                  'border rounded-lg overflow-hidden transition-all duration-200',
                  isDeclined ? 'border-border opacity-60' : 'border-border',
                  isAccepted ? 'border-success/30 bg-success-bg/20' : '',
                  'bg-card',
                ].join(' ')}
              >
                <button
                  onClick={() => toggleExpand(inv.id)}
                  className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-muted/30 transition-colors duration-150"
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-xs font-700 text-primary shrink-0 mt-0.5">
                    {inv.companyInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-600 text-foreground truncate">{inv.role}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building2 size={11} className="shrink-0" />
                          {inv.company} · {inv.department}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isAccepted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-500 text-success bg-success-bg border border-success-border rounded-full px-2 py-0.5">
                            <CheckCircle2 size={11} /> Accepted
                          </span>
                        )}
                        {isDeclined && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-500 text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">
                            <XCircle size={11} /> Declined
                          </span>
                        )}
                        <ChevronRight
                          size={15}
                          className={['text-muted-foreground transition-transform duration-200', isExpanded ? 'rotate-90' : ''].join(' ')}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className={['inline-flex items-center text-[11px] font-500 rounded-full px-2 py-0.5', typeColors[inv.interviewType]].join(' ')}>
                        {inv.interviewType}
                      </span>
                      <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                        <Clock size={11} />
                        {inv.duration} min
                      </span>
                      <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                        <Calendar size={11} />
                        {inv.scheduledWindow}
                      </span>
                      {inv.urgency === 'high' && (
                        <span className="flex items-center gap-1 text-[11px] text-danger font-500">
                          <AlertCircle size={11} />
                          Expires {inv.expiresAt}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    <div>
                      <p className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Tag size={11} />
                        Focus Areas
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {inv.skillsAssessed.map(skill => (
                          <span
                            key={skill}
                            className="text-[12px] font-500 bg-muted text-foreground border border-border rounded-md px-2 py-0.5"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-muted/40 rounded-md px-3 py-2.5">
                        <p className="text-[10px] font-600 uppercase tracking-widest text-muted-foreground">Duration</p>
                        <p className="text-sm font-600 text-foreground mt-0.5">{inv.duration} minutes</p>
                      </div>
                      <div className="bg-muted/40 rounded-md px-3 py-2.5">
                        <p className="text-[10px] font-600 uppercase tracking-widest text-muted-foreground">Format</p>
                        <p className="text-sm font-600 text-foreground mt-0.5">{inv.interviewType}</p>
                      </div>
                      <div className="bg-muted/40 rounded-md px-3 py-2.5">
                        <p className="text-[10px] font-600 uppercase tracking-widest text-muted-foreground">When</p>
                        <p className="text-sm font-600 text-foreground mt-0.5">{inv.scheduledWindow}</p>
                      </div>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-md px-3 py-3">
                      <p className="text-[11px] font-600 uppercase tracking-widest text-muted-foreground mb-1.5">Instructions</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{inv.instructions}</p>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAccept(inv)}
                          disabled={busy}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-500 hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                          Accept & Begin Setup
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecline(inv)}
                          disabled={busy}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-500 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors duration-150 disabled:opacity-50"
                        >
                          <XCircle size={15} />
                          Decline
                        </button>
                      </div>
                    )}

                    {isAccepted && (
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            prepareSession(inv);
                            router.push('/interview-setup');
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-500 hover:bg-primary/90 transition-colors duration-150"
                        >
                          Continue to Setup
                          <ChevronRight size={15} />
                        </button>
                        <p className="text-xs text-muted-foreground">You accepted this invitation.</p>
                      </div>
                    )}

                    {isDeclined && (
                      <div className="flex items-center gap-2 pt-1">
                        <p className="text-xs text-muted-foreground">You declined this invitation.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
