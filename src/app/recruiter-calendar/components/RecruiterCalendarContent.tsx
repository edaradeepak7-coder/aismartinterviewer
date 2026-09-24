'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight, Loader2, AlertCircle, CalendarDays, Filter,  } from 'lucide-react';

interface Booking {
  id: string;
  slot_id: string;
  candidate_id: string;
  interview_id: string | null;
  notes: string | null;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
  recruiter_availability: {
    id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: 'available' | 'booked' | 'cancelled';
    recruiter_id: string;
  } | null;
  candidates: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar_initials: string | null;
  } | null;
}

interface AvailabilitySlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'available' | 'booked' | 'cancelled';
  notes: string | null;
  recruiter_id: string;
}

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'cancelled';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDate(dateStr: string) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function RecruiterCalendarContent() {
  const supabase = createClient();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{ booking: Booking; open: boolean } | null>(null);
  const [selectedNewSlot, setSelectedNewSlot] = useState<string>('');

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not authenticated'); setLoading(false); return; }

      // Fetch bookings for this recruiter's slots only
      const { data: bookingsData, error: bookingsErr } = await supabase
        .from('interview_bookings')
        .select(`
          *,
          recruiter_availability!inner(*, user_profiles(full_name, email)),
          candidates(id, name, email, role, avatar_initials, user_id)
        `)
        .eq('recruiter_availability.recruiter_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsErr) throw bookingsErr;

      // Fetch all availability slots for this recruiter
      const { data: slotsData, error: slotsErr } = await supabase
        .from('recruiter_availability')
        .select('*')
        .eq('recruiter_id', user.id)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (slotsErr) throw slotsErr;

      setBookings((bookingsData || []) as Booking[]);
      setSlots((slotsData || []) as AvailabilitySlot[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calendar grid helpers
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const bookedDates = new Set(
    bookings
      .filter(b => b.recruiter_availability?.slot_date)
      .map(b => b.recruiter_availability!.slot_date)
  );
  const availableDates = new Set(
    slots.filter(s => s.status === 'available').map(s => s.slot_date)
  );

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const toDateStr = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Filter bookings
  const filteredBookings = bookings.filter(b => {
    if (selectedDate) {
      if (b.recruiter_availability?.slot_date !== selectedDate) return false;
    }
    if (filterStatus === 'confirmed') return b.confirmed;
    if (filterStatus === 'pending') return !b.confirmed;
    if (filterStatus === 'cancelled') return b.recruiter_availability?.status === 'cancelled';
    return true;
  });

  // Actions
  const handleConfirm = async (booking: Booking) => {
    setActionLoading(booking.id);
    try {
      const { error } = await supabase
        .from('interview_bookings')
        .update({ confirmed: true, updated_at: new Date().toISOString() })
        .eq('id', booking.id);
      if (error) throw error;

      const userId = (booking.candidates as any)?.user_id;
      // Resolve candidate user_id if not joined
      let notifyUserId = userId as string | undefined;
      if (!notifyUserId && booking.candidate_id) {
        const { data: cand } = await supabase
          .from('candidates')
          .select('user_id')
          .eq('id', booking.candidate_id)
          .maybeSingle();
        notifyUserId = cand?.user_id || undefined;
      }
      if (notifyUserId) {
        const slot = booking.recruiter_availability;
        await supabase.from('notifications').insert({
          user_id: notifyUserId,
          type: 'booking_confirmed',
          title: 'Interview booking confirmed',
          message: slot
            ? `Your interview on ${slot.slot_date} at ${String(slot.start_time).slice(0, 5)} is confirmed.`
            : 'Your interview booking has been confirmed by the recruiter.',
          is_read: false,
          action_url: '/invitations',
          metadata: { booking_id: booking.id },
        });
      }

      showToast('Booking confirmed — candidate notified', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm booking', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (booking: Booking) => {
    setActionLoading(booking.id);
    try {
      // Cancel the slot
      const { error: slotErr } = await supabase
        .from('recruiter_availability')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', booking.slot_id);
      if (slotErr) throw slotErr;

      // Delete the booking
      const { error: bookingErr } = await supabase
        .from('interview_bookings')
        .delete()
        .eq('id', booking.id);
      if (bookingErr) throw bookingErr;

      showToast('Booking cancelled', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel booking', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleModal?.booking || !selectedNewSlot) return;
    const booking = rescheduleModal.booking;
    setActionLoading(booking.id);
    try {
      // Free old slot
      await supabase
        .from('recruiter_availability')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', booking.slot_id);

      // Book new slot
      await supabase
        .from('recruiter_availability')
        .update({ status: 'booked', updated_at: new Date().toISOString() })
        .eq('id', selectedNewSlot);

      // Update booking
      const { error } = await supabase
        .from('interview_bookings')
        .update({ slot_id: selectedNewSlot, confirmed: false, updated_at: new Date().toISOString() })
        .eq('id', booking.id);
      if (error) throw error;

      showToast('Interview rescheduled successfully', 'success');
      setRescheduleModal(null);
      setSelectedNewSlot('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const availableSlots = slots.filter(s => s.status === 'available');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <CalendarDays size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Interview Calendar</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Manage candidate availability slots and scheduled interviews</p>
          </div>
        </div>

        {/* Stat pills */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Calendar size={16} className="text-[#0D9488]" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">{bookings.length}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Total Bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <CheckCircle size={16} className="text-emerald-500" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">{bookings.filter(b => b.confirmed).length}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Confirmed</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] transition-colors bg-white"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-[#E8ECF4]">
        {(['All Bookings', 'Confirmed', 'Pending', 'Cancelled'] as const).map((label, i) => (
          <button
            key={label}
            onClick={() => setFilterStatus((['all', 'confirmed', 'pending', 'cancelled'] as FilterStatus[])[i])}
            className={[
              'px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px',
              filterStatus === (['all', 'confirmed', 'pending', 'cancelled'] as FilterStatus[])[i]
                ? 'border-[#0D9488] text-[#0D9488]' :'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="bg-card border border-border rounded-xl p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-600 text-foreground">
              {MONTHS[calMonth]} {calYear}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-600 text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(calYear, calMonth, day);
              const isToday = dateStr === toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
              const hasBooking = bookedDates.has(dateStr);
              const hasAvailable = availableDates.has(dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`relative aspect-square flex items-center justify-center text-xs rounded-md transition-all ${
                    isSelected
                      ? 'bg-primary text-white font-600'
                      : isToday
                      ? 'bg-primary/15 text-primary font-600' :'text-foreground hover:bg-muted'
                  }`}
                >
                  {day}
                  {/* Dots */}
                  {(hasBooking || hasAvailable) && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {hasBooking && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                      {hasAvailable && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              Booked slots
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              Available slots
            </div>
          </div>
        </div>

        {/* Bookings list */}
        <div className="xl:col-span-2 space-y-4">
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-muted-foreground" />
            {(['all', 'confirmed', 'pending', 'cancelled'] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 text-xs font-500 rounded-full transition-colors capitalize ${
                  filterStatus === f
                    ? 'bg-primary text-white' :'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-500 text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
              >
                <CalendarDays size={12} />
                {formatDate(selectedDate)}
                <XCircle size={12} />
              </button>
            )}
          </div>

          {/* Booking cards */}
          {filteredBookings.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <CalendarDays size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-500 text-foreground mb-1">No bookings found</p>
              <p className="text-xs text-muted-foreground">
                {selectedDate ? `No interviews scheduled for ${formatDate(selectedDate)}` : 'No bookings match the selected filter'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map(booking => {
                const slot = booking.recruiter_availability;
                const candidate = booking.candidates;
                const isActioning = actionLoading === booking.id;
                const isCancelled = slot?.status === 'cancelled';

                return (
                  <div
                    key={booking.id}
                    className={`bg-card border rounded-xl p-5 transition-all ${
                      isCancelled ? 'border-border opacity-60' : booking.confirmed ? 'border-emerald-500/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-600 text-primary shrink-0">
                          {candidate?.avatar_initials || candidate?.name?.slice(0, 2).toUpperCase() || 'CA'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-600 text-foreground truncate">
                            {candidate?.name || 'Unknown Candidate'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{candidate?.email}</p>
                          {candidate?.role && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Applying for: <span className="text-foreground">{candidate.role}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="shrink-0">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-500 rounded-full">
                            <XCircle size={11} /> Cancelled
                          </span>
                        ) : booking.confirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-500 rounded-full">
                            <CheckCircle size={11} /> Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-500 rounded-full">
                            <Clock size={11} /> Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Slot info */}
                    {slot && (
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={12} />
                          {formatDate(slot.slot_date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                        </span>
                        <span className="text-muted-foreground/60">{slot.duration_minutes} min</span>
                      </div>
                    )}

                    {booking.notes && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                        📝 {booking.notes}
                      </p>
                    )}

                    {/* Actions */}
                    {!isCancelled && (
                      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border">
                        {!booking.confirmed && (
                          <button
                            onClick={() => handleConfirm(booking)}
                            disabled={isActioning}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-500 rounded-md transition-colors disabled:opacity-50"
                          >
                            {isActioning ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            Confirm
                          </button>
                        )}
                        <button
                          onClick={() => { setRescheduleModal({ booking, open: true }); setSelectedNewSlot(''); }}
                          disabled={isActioning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-500 rounded-md transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={12} />
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleCancel(booking)}
                          disabled={isActioning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-500 rounded-md transition-colors disabled:opacity-50"
                        >
                          {isActioning ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-base font-600 text-foreground mb-1">Reschedule Interview</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select a new available slot for{' '}
              <span className="text-foreground font-500">
                {rescheduleModal.booking.candidates?.name || 'this candidate'}
              </span>
            </p>

            {availableSlots.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4 text-center mb-4">
                No available slots. Please add availability first.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {availableSlots.map(slot => (
                  <label
                    key={slot.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedNewSlot === slot.id
                        ? 'border-primary bg-primary/10' :'border-border hover:border-primary/40 hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="newSlot"
                      value={slot.id}
                      checked={selectedNewSlot === slot.id}
                      onChange={() => setSelectedNewSlot(slot.id)}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-sm font-500 text-foreground">{formatDate(slot.slot_date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)} · {slot.duration_minutes} min
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setRescheduleModal(null); setSelectedNewSlot(''); }}
                className="px-4 py-2 text-sm font-500 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={!selectedNewSlot || actionLoading === rescheduleModal.booking.id}
                className="flex items-center gap-2 px-4 py-2 text-sm font-600 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === rescheduleModal.booking.id && <Loader2 size={14} className="animate-spin" />}
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
