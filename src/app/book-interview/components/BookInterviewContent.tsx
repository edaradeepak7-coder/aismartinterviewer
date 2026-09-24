'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Clock, CheckCircle2, Loader2, CalendarDays, AlertCircle, Briefcase, Building2, ArrowLeft } from 'lucide-react';
import { availabilityService, bookingService, DBAvailabilitySlot } from '@/lib/services/offerService';
import { candidateService } from '@/lib/services/interviewService';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  description: string | null;
  created_by: string | null;
  applications_count?: number | null;
  user_profiles?: { full_name: string; company_name: string | null } | null;
}

function groupByDate(slots: DBAvailabilitySlot[]): Record<string, DBAvailabilitySlot[]> {
  return slots.reduce((acc, slot) => {
    const date = slot.slot_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, DBAvailabilitySlot[]>);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function BookInterviewContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get('job');

  const [job, setJob] = useState<JobPosting | null>(null);
  const [jobLoading, setJobLoading] = useState(!!jobIdParam);
  const [slots, setSlots] = useState<DBAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobIdParam) {
      setJob(null);
      setJobLoading(false);
      return;
    }
    setJobLoading(true);
    const supabase = createClient();
    supabase
      .from('job_postings')
      .select('id, title, department, description, created_by, applications_count, user_profiles(full_name, company_name)')
      .eq('id', jobIdParam)
      .maybeSingle()
      .then(({ data }) => {
        setJob((data as JobPosting | null) || null);
        setJobLoading(false);
      });
  }, [jobIdParam]);

  useEffect(() => {
    let cancelled = false;
    async function loadSlots() {
      setLoading(true);
      // Wait for job when scoping to a posting
      if (jobIdParam && jobLoading) return;

      const recruiterId = jobIdParam ? job?.created_by || undefined : undefined;
      // Job without a posting owner → show empty (don't fall back to all recruiters)
      if (jobIdParam && job && !job.created_by) {
        if (!cancelled) {
          setSlots([]);
          setSelectedDate(null);
          setLoading(false);
        }
        return;
      }
      if (jobIdParam && !job && !jobLoading) {
        if (!cancelled) {
          setSlots([]);
          setLoading(false);
        }
        return;
      }

      const data = await availabilityService.getAvailableSlots(recruiterId);
      if (cancelled) return;
      setSlots(data);
      setSelectedDate(data.length > 0 ? data[0].slot_date : null);
      setSelectedSlot(null);
      setLoading(false);
    }
    void loadSlots();
    return () => {
      cancelled = true;
    };
  }, [jobIdParam, job, jobLoading]);

  const grouped = groupByDate(slots);
  const dates = Object.keys(grouped).sort();

  const handleBook = async () => {
    if (!selectedSlot || !user) return;
    setBooking(true);
    setError(null);

    const candidate = await candidateService.getByUserId(user.id);
    if (!candidate) {
      setError('Candidate profile not found. Please complete your profile first.');
      setBooking(false);
      return;
    }

    const slot = slots.find((s) => s.id === selectedSlot);
    if (!slot) {
      setError('Selected slot not found. Please try again.');
      setBooking(false);
      return;
    }

    const result = await bookingService.create({
      slot_id: selectedSlot,
      candidate_id: candidate.id,
      notes: notes || undefined,
      job_posting_id: job?.id || jobIdParam || undefined,
      confirmed: true,
    });

    if (result) {
      setBooked(true);
      setSlots((prev) => prev.filter((s) => s.id !== selectedSlot));
      if (job) {
        setJob((prev) =>
          prev
            ? { ...prev, applications_count: (prev.applications_count ?? 0) + 1 }
            : prev,
        );
      }
    } else {
      setError('Failed to book the slot. It may have been taken, or the job has no matching recruiter slots.');
    }
    setBooking(false);
  };

  if (booked) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h2 className="text-xl font-600 text-foreground">Interview Slot Booked!</h2>
        {job && <p className="text-sm text-primary font-500">{job.title}</p>}
        <p className="text-sm text-muted-foreground">
          Your interview slot has been confirmed. You will receive a confirmation shortly.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/invitations')}
            className="px-4 py-2 bg-primary text-white text-sm font-600 rounded-md hover:bg-primary/90 transition-colors"
          >
            View Invitations
          </button>
          <button
            type="button"
            onClick={() => {
              setBooked(false);
              setSelectedSlot(null);
            }}
            className="px-4 py-2 border border-border text-sm font-500 text-muted-foreground rounded-md hover:bg-muted transition-colors"
          >
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {jobIdParam && (
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Jobs
        </button>
      )}

      <div>
        <h1 className="text-xl font-600 text-foreground">Book Interview Slot</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {jobIdParam
            ? 'Select a date and time from this job’s recruiter calendar.'
            : "Select a date and time from the recruiter's available calendar."}
        </p>
      </div>

      {jobIdParam && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
          {jobLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Loading job details…
            </div>
          ) : job ? (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Briefcase size={15} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-600 text-foreground">{job.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Building2 size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {job.user_profiles?.company_name?.trim() || 'Company not listed'}
                    {job.department ? ` · ${job.department}` : ''}
                    {typeof job.applications_count === 'number'
                      ? ` · ${job.applications_count} application${job.applications_count === 1 ? '' : 's'}`
                      : ''}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Job posting not found. You can still book a general slot below.</p>
          )}
        </div>
      )}

      {loading || (jobIdParam && jobLoading) ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <CalendarDays size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-500 text-foreground">No available slots</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {jobIdParam
              ? job && !job.created_by
                ? 'This job has no recruiter owner, so slots cannot be listed. Ask the recruiter to re-publish the posting.'
                : 'This job’s recruiter has no open slots right now. Check back later.'
              : 'The recruiter has no open slots right now. Check back later.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-2 space-y-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Select Date</p>
            <div className="space-y-1.5">
              {dates.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  className={[
                    'w-full text-left px-3 py-3 rounded-lg border transition-all duration-150',
                    selectedDate === date
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar
                        size={14}
                        className={selectedDate === date ? 'text-primary' : 'text-muted-foreground'}
                      />
                      <span className="text-sm font-500">{formatDate(date)}</span>
                    </div>
                    <span
                      className={[
                        'text-[11px] font-600 rounded-full px-1.5 py-0.5',
                        selectedDate === date ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                      ].join(' ')}
                    >
                      {grouped[date].length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 space-y-4">
            {selectedDate && grouped[selectedDate] ? (
              <>
                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">
                  Available Times — {formatDate(selectedDate)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {grouped[selectedDate].map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot.id)}
                      className={[
                        'flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-500 transition-all duration-150',
                        selectedSlot === slot.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-foreground hover:border-primary/40',
                      ].join(' ')}
                    >
                      <Clock size={14} />
                      {formatTime(slot.start_time)}
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {slot.duration_minutes}m
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Anything the recruiter should know…"
                    className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={!selectedSlot || booking}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-600 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {booking ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Booking…
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Select a date to see times</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
