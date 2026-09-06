'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Clock, CheckCircle2, Loader2, CalendarDays, User, AlertCircle, Briefcase, Building2, ArrowLeft } from 'lucide-react';
import { availabilityService, bookingService, DBAvailabilitySlot } from '@/lib/services/offerService';
import { candidateService } from '@/lib/services/interviewService';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  description: string | null;
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
    if (jobIdParam) {
      const supabase = createClient();
      supabase
        .from('job_postings')
        .select('*, user_profiles(full_name, company_name)')
        .eq('id', jobIdParam)
        .maybeSingle()
        .then(({ data }) => {
          setJob(data || null);
          setJobLoading(false);
        });
    }
  }, [jobIdParam]);

  useEffect(() => {
    availabilityService.getAvailableSlots().then(data => {
      setSlots(data);
      if (data.length > 0) setSelectedDate(data[0].slot_date);
      setLoading(false);
    });
  }, []);

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

    // Find the selected slot to get recruiter_id and timing
    const slot = slots.find(s => s.id === selectedSlot);
    if (!slot) {
      setError('Selected slot not found. Please try again.');
      setBooking(false);
      return;
    }

    // Create an interview record linked to the job posting
    let interviewId: string | undefined;
    try {
      const supabase = createClient();
      const scheduledAt = new Date(`${slot.slot_date}T${slot.start_time}`).toISOString();
      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .insert({
          candidate_id: candidate.id,
          recruiter_id: slot.recruiter_id,
          role: job?.title || 'General Interview',
          company: job?.user_profiles?.company_name || 'Meridian Technologies',
          department: job?.department || null,
          interview_type: 'technical',
          status: 'scheduled',
          scheduled_at: scheduledAt,
          duration_minutes: slot.duration_minutes,
        })
        .select('id')
        .single();

      if (!interviewError && interviewData) {
        interviewId = interviewData.id;
      }
    } catch {
      // Non-fatal — booking can still proceed
    }

    const result = await bookingService.create({
      slot_id: selectedSlot,
      candidate_id: candidate.id,
      interview_id: interviewId,
      notes: notes || undefined,
    });

    if (result) {
      setBooked(true);
      setSlots(prev => prev.filter(s => s.id !== selectedSlot));
    } else {
      setError('Failed to book the slot. It may have been taken. Please select another.');
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
        {job && (
          <p className="text-sm text-primary font-500">{job.title}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Your interview slot has been confirmed. You will receive a confirmation shortly.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-primary text-white text-sm font-600 rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => { setBooked(false); setSelectedSlot(null); }}
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
      {/* Back link if came from jobs */}
      {jobIdParam && (
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Jobs
        </button>
      )}

      <div>
        <h1 className="text-xl font-600 text-foreground">Book Interview Slot</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Select a date and time from the recruiter's available calendar.</p>
      </div>

      {/* Job context banner */}
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
                    {job.user_profiles?.company_name || 'Meridian Technologies'}
                    {job.department ? ` · ${job.department}` : ''}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <CalendarDays size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-500 text-foreground">No available slots</p>
          <p className="text-xs text-muted-foreground mt-1">The recruiter has no open slots right now. Check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Date picker */}
          <div className="md:col-span-2 space-y-2">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Select Date</p>
            <div className="space-y-1.5">
              {dates.map(date => (
                <button
                  key={date}
                  onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                  className={[
                    'w-full text-left px-3 py-3 rounded-lg border transition-all duration-150',
                    selectedDate === date
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className={selectedDate === date ? 'text-primary' : 'text-muted-foreground'} />
                      <span className="text-sm font-500">{formatDate(date)}</span>
                    </div>
                    <span className={['text-[11px] font-600 rounded-full px-1.5 py-0.5', selectedDate === date ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'].join(' ')}>
                      {grouped[date].length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div className="md:col-span-3 space-y-4">
            {selectedDate && grouped[selectedDate] ? (
              <>
                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">
                  Available Times — {formatDate(selectedDate)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {grouped[selectedDate].map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={[
                        'flex flex-col items-start px-3 py-3 rounded-lg border transition-all duration-150',
                        selectedSlot === slot.id
                          ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-1.5 text-sm font-600 text-foreground">
                        <Clock size={13} className={selectedSlot === slot.id ? 'text-primary' : 'text-muted-foreground'} />
                        {formatTime(slot.start_time)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {slot.duration_minutes} min · ends {formatTime(slot.end_time)}
                      </p>
                      {(slot as any).user_profiles?.full_name && (
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                          <User size={10} />
                          {(slot as any).user_profiles.full_name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Notes + Confirm */}
                {selectedSlot && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div>
                      <label className="text-xs font-600 text-muted-foreground uppercase tracking-wide block mb-1.5">
                        Notes (optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Any notes for the recruiter..."
                        rows={2}
                        className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
                      />
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-danger bg-danger-bg border border-danger-border rounded-md px-3 py-2">
                        <AlertCircle size={14} />
                        {error}
                      </div>
                    )}
                    <button
                      onClick={handleBook}
                      disabled={booking}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-600 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {booking ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Confirm Booking
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <CalendarDays size={28} className="text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Select a date to see available times</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
