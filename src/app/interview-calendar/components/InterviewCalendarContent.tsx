'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, Loader2, Globe, User, Plus, Trash2, RefreshCw, CalendarDays, Shield, Info, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { csrfHeaders } from '@/lib/api/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Slot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'available' | 'booked' | 'cancelled';
  recruiter_id: string;
  notes?: string;
  booking?: {
    id: string;
    candidate_id?: string;
    candidate_name: string;
    candidate_email: string;
    confirmed: boolean;
    notes?: string;
    candidate_user_id?: string | null;
  };
}

interface NewSlotForm {
  slot_date: string;
  start_time: string;
  duration: number;
  notes: string;
}

const RECRUITER_ROLES = new Set([
  'recruiter', 'admin', 'super_admin', 'institution_admin', 'org_admin', 'placement_officer', 'evaluator', 'faculty',
]);

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST — India Standard Time (UTC+5:30)' },
  { value: 'America/New_York', label: 'EST — Eastern Time (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'PST — Pacific Time (UTC-8)' },
  { value: 'America/Chicago', label: 'CST — Central Time (UTC-6)' },
  { value: 'Europe/London', label: 'GMT — Greenwich Mean Time (UTC+0)' },
  { value: 'Europe/Berlin', label: 'CET — Central European Time (UTC+1)' },
  { value: 'Asia/Dubai', label: 'GST — Gulf Standard Time (UTC+4)' },
  { value: 'Asia/Singapore', label: 'SGT — Singapore Time (UTC+8)' },
  { value: 'Australia/Sydney', label: 'AEST — Australian Eastern Time (UTC+10)' },
  { value: 'Pacific/Auckland', label: 'NZST — New Zealand Standard Time (UTC+12)' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatTimeInTz(timeStr: string, dateStr: string, toTz: string): string {
  try {
    const dt = new Date(`${dateStr}T${timeStr}`);
    return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: toTz });
  } catch {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
}

function formatDate(dateStr: string) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function isConflict(slots: Slot[], date: string, startTime: string, duration: number, excludeId?: string): boolean {
  const newStart = startTime;
  const newEnd = addMinutes(startTime, duration);
  return slots
    .filter(s => s.slot_date === date && s.status !== 'cancelled' && s.id !== excludeId)
    .some(s => newStart < s.end_time && newEnd > s.start_time);
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', info: 'bg-blue-500' };
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-500 shadow-lg ${colors[type]}`}>
      {type === 'success' ? <CheckCircle size={15} /> : type === 'error' ? <XCircle size={15} /> : <Info size={15} />}
      {msg}
    </div>
  );
}

function SlotCard({ slot, tz, onConfirm, onCancel, onBook, isRecruiter, loading }: {
  slot: Slot; tz: string; onConfirm?: (id: string) => void; onCancel?: (id: string) => void;
  onBook?: (id: string) => void; isRecruiter: boolean; loading: boolean;
}) {
  const startFormatted = formatTimeInTz(slot.start_time, slot.slot_date, tz);
  const endFormatted = formatTimeInTz(slot.end_time, slot.slot_date, tz);
  const statusColors: Record<string, string> = {
    available: 'border-emerald-400/30 bg-emerald-400/5',
    booked: 'border-blue-400/30 bg-blue-400/5',
    cancelled: 'border-red-400/20 bg-red-400/5 opacity-60',
  };
  return (
    <div className={`rounded-xl border p-4 transition-all ${statusColors[slot.status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={13} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-600 text-foreground">{startFormatted} – {endFormatted}</span>
            <span className="text-xs text-muted-foreground">({slot.duration_minutes}m)</span>
          </div>
          {slot.booking && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <User size={11} className="text-blue-400" />
              <span className="text-xs text-blue-400 font-500">{slot.booking.candidate_name}</span>
              {slot.booking.confirmed && <CheckCircle size={11} className="text-emerald-400" />}
            </div>
          )}
          {slot.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{slot.notes}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {slot.status === 'available' && !isRecruiter && onBook && (
            <button
              onClick={() => onBook(slot.id)}
              disabled={loading}
              className="px-3 py-1.5 bg-primary text-white text-xs font-600 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Book
            </button>
          )}
          {isRecruiter && slot.status === 'booked' && slot.booking && !slot.booking.confirmed && onConfirm && (
            <button
              onClick={() => onConfirm(slot.id)}
              disabled={loading}
              className="px-2.5 py-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-600 rounded-lg hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
          )}
          {isRecruiter && slot.status !== 'cancelled' && onCancel && (
            <button
              onClick={() => onCancel(slot.id)}
              disabled={loading}
              className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
            </button>
          )}
          <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border ${
            slot.status === 'available' ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25' :
            slot.status === 'booked' ? 'bg-blue-400/15 text-blue-400 border-blue-400/25' : 'bg-red-400/15 text-red-400 border-red-400/25'
          }`}>
            {slot.status === 'available' ? 'Open' : slot.status === 'booked' ? 'Booked' : 'Cancelled'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function InterviewCalendarContent() {
  const { user } = useAuth();
  const supabase = createClient();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [userRole, setUserRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [showTzPicker, setShowTzPicker] = useState(false);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()));

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlot, setNewSlot] = useState<NewSlotForm>({
    slot_date: selectedDate,
    start_time: '09:00',
    duration: 30,
    notes: '',
  });
  const [conflictWarning, setConflictWarning] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => setToast({ msg, type });
  const isRecruiter = userRole === 'recruiter';

  useEffect(() => {
    if (!user) return;
    supabase.from('user_profiles').select('role, timezone').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.role && RECRUITER_ROLES.has(data.role)) setUserRole('recruiter');
        else setUserRole('candidate');
        if (data?.timezone && TIMEZONES.some(t => t.value === data.timezone)) {
          setTimezone(data.timezone);
        }
      });
  }, [user, supabase]);

  useEffect(() => {
    // Fallback to browser TZ only if profile did not set one (still Asia/Kolkata default until profile loads)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TIMEZONES.find(t => t.value === tz)) {
        setTimezone((prev) => (prev === 'Asia/Kolkata' ? tz : prev));
      }
    } catch { /* keep default */ }
  }, []);

  const fetchSlots = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let slotsQuery = supabase
        .from('recruiter_availability')
        .select('*')
        .order('slot_date')
        .order('start_time');

      if (isRecruiter) {
        slotsQuery = slotsQuery.eq('recruiter_id', user.id);
      } else {
        slotsQuery = slotsQuery.in('status', ['available', 'booked']);
      }

      const { data: slotsData, error: slotsErr } = await slotsQuery;
      if (slotsErr) throw slotsErr;

      const { data: bookingsData, error: bookingsErr } = await supabase
        .from('interview_bookings')
        .select('*, candidates(name, email, user_id)');
      if (bookingsErr) throw bookingsErr;

      const { data: myCandidate } = !isRecruiter
        ? await supabase.from('candidates').select('id').eq('user_id', user.id).maybeSingle()
        : { data: null };

      const bookingMap: Record<string, Slot['booking']> = {};
      (bookingsData || []).forEach((b: any) => {
        bookingMap[b.slot_id] = {
          id: b.id,
          candidate_id: b.candidate_id,
          candidate_name: b.candidates?.name || 'Unknown',
          candidate_email: b.candidates?.email || '',
          confirmed: b.confirmed,
          notes: b.notes,
          candidate_user_id: b.candidates?.user_id || null,
        };
      });

      let mapped: Slot[] = (slotsData || []).map((s: any) => ({
        ...s,
        booking: bookingMap[s.id],
      }));

      if (!isRecruiter && myCandidate?.id) {
        mapped = mapped.filter(
          (s) => s.status === 'available' || s.booking?.candidate_id === myCandidate.id
        );
      } else if (!isRecruiter) {
        mapped = mapped.filter((s) => s.status === 'available');
      }

      setSlots(mapped);
    } catch (err: any) {
      showToast(err.message || 'Failed to load calendar', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, isRecruiter, supabase]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const slotsByDate = slots.reduce((acc, s) => {
    if (!acc[s.slot_date]) acc[s.slot_date] = [];
    acc[s.slot_date].push(s);
    return acc;
  }, {} as Record<string, Slot[]>);

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  const selectedSlots = slotsByDate[selectedDate] || [];

  const handleBook = async (slotId: string) => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { data: candidate } = await supabase.from('candidates').select('id').eq('user_id', user.id).maybeSingle();
      if (!candidate) { showToast('Candidate profile not found', 'error'); return; }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ slot_id: slotId, candidate_id: candidate.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to book slot');

      showToast('Slot booked! Check Invitations for details.', 'success');
      fetchSlots();
    } catch (err: any) {
      showToast(err.message || 'Failed to book slot', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async (slotId: string) => {
    setActionLoading(true);
    try {
      const slot = slots.find(s => s.id === slotId);
      if (!slot?.booking) return;

      const res = await fetch(`/api/bookings/${slot.booking.id}`, {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ confirmed: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to confirm');

      const userId = slot.booking.candidate_user_id;
      if (userId) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'booking_confirmed',
          title: 'Interview booking confirmed',
          message: `Your interview on ${formatDate(slot.slot_date)} at ${slot.start_time.slice(0, 5)} is confirmed. Open Invitations to prepare.`,
          is_read: false,
          action_url: '/invitations',
          metadata: { booking_id: slot.booking.id, slot_id: slot.id },
        });
      }

      showToast('Booking confirmed and candidate notified.', 'success');
      fetchSlots();
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (slotId: string) => {
    setActionLoading(true);
    try {
      const slot = slots.find(s => s.id === slotId);
      if (slot?.booking) {
        const del = await fetch(`/api/bookings/${slot.booking.id}`, {
          method: 'DELETE',
          headers: csrfHeaders(),
        });
        if (!del.ok) {
          const json = await del.json().catch(() => ({}));
          throw new Error(json.error || 'Failed to remove booking');
        }
      } else {
        const res = await fetch(`/api/availability/${slotId}`, {
          method: 'PATCH',
          headers: csrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ status: 'cancelled' }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to cancel');
      }
      showToast('Slot cancelled.', 'info');
      fetchSlots();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!user) return;
    if (conflictWarning) { showToast('Please resolve the time conflict before saving.', 'error'); return; }
    setActionLoading(true);
    try {
      const endTime = addMinutes(newSlot.start_time, newSlot.duration);
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          slot_date: newSlot.slot_date,
          start_time: newSlot.start_time,
          end_time: endTime,
          duration_minutes: newSlot.duration,
          notes: newSlot.notes || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to add slot');
      showToast('Availability slot added.', 'success');
      setShowAddForm(false);
      setNewSlot({ slot_date: selectedDate, start_time: '09:00', duration: 30, notes: '' });
      fetchSlots();
    } catch (err: any) {
      showToast(err.message || 'Failed to add slot', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (!showAddForm) return;
    setConflictWarning(isConflict(slots, newSlot.slot_date, newSlot.start_time, newSlot.duration));
  }, [newSlot, slots, showAddForm]);

  const tzLabel = TIMEZONES.find(t => t.value === timezone)?.label.split(' — ')[0] || timezone;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-700 text-foreground">Interview Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRecruiter ? 'Manage your availability and confirm bookings' : 'Browse and book available interview slots'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setShowTzPicker(o => !o)}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm font-500 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <Globe size={14} className="text-primary" />
              {tzLabel}
              <ChevronDown size={12} />
            </button>
            {showTzPicker && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-xl w-80 max-h-64 overflow-y-auto">
                {TIMEZONES.map(tz => (
                  <button
                    key={tz.value}
                    onClick={() => { setTimezone(tz.value); setShowTzPicker(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors ${timezone === tz.value ? 'text-primary font-600' : 'text-foreground'}`}
                  >
                    {tz.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={fetchSlots} className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={14} />
          </button>
          {isRecruiter && (
            <button
              onClick={() => { setShowAddForm(o => !o); setNewSlot(f => ({ ...f, slot_date: selectedDate })); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-600 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} /> Add Slot
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Slots', value: slots.length, color: 'text-foreground' },
          { label: 'Available', value: slots.filter(s => s.status === 'available').length, color: 'text-emerald-400' },
          { label: 'Booked', value: slots.filter(s => s.status === 'booked').length, color: 'text-blue-400' },
          { label: 'Confirmed', value: slots.filter(s => s.booking?.confirmed).length, color: 'text-primary' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-700 mt-1 tabular-nums ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
            <span className="text-sm font-600 text-foreground">{MONTHS[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-600 text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(calYear, calMonth, day);
              const daySlots = slotsByDate[dateStr] || [];
              const hasAvailable = daySlots.some(s => s.status === 'available');
              const hasBooked = daySlots.some(s => s.status === 'booked');
              const isToday = dateStr === toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
              const isSelected = dateStr === selectedDate;
              const isPast = new Date(dateStr) < new Date(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()));

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  disabled={isPast}
                  className={[
                    'relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-500 transition-all',
                    isSelected ? 'bg-primary text-white' : isToday ? 'bg-primary/15 text-primary font-700' : isPast ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-foreground hover:bg-muted',
                  ].join(' ')}
                >
                  {day}
                  {daySlots.length > 0 && !isSelected && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasAvailable && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                      {hasBooked && <div className="w-1 h-1 rounded-full bg-blue-400" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-emerald-400" /> Available
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-400" /> Booked
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-600 text-foreground flex items-center gap-2">
              <CalendarDays size={15} className="text-primary" />
              {formatDate(selectedDate)}
            </h3>
            <span className="text-xs text-muted-foreground">{selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}</span>
          </div>

          {showAddForm && isRecruiter && (
            <div className="bg-card border border-primary/20 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-600 text-foreground flex items-center gap-2">
                <Plus size={14} className="text-primary" /> Add Availability Slot
              </h4>
              {conflictWarning && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-400/10 border border-red-400/25 rounded-lg text-xs text-red-400">
                  <Shield size={12} /> Time conflict detected with an existing slot
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-500 text-muted-foreground block mb-1">Date</label>
                  <input
                    type="date"
                    value={newSlot.slot_date}
                    min={toDateStr(today.getFullYear(), today.getMonth(), today.getDate())}
                    onChange={e => setNewSlot(f => ({ ...f, slot_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-500 text-muted-foreground block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newSlot.start_time}
                    onChange={e => setNewSlot(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-500 text-muted-foreground block mb-1">Duration</label>
                  <select
                    value={newSlot.duration}
                    onChange={e => setNewSlot(f => ({ ...f, duration: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    {[15, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-500 text-muted-foreground block mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={newSlot.notes}
                    onChange={e => setNewSlot(f => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. React role"
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAddSlot}
                  disabled={actionLoading || conflictWarning}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-600 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  Save Slot
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-primary" />
            </div>
          ) : selectedSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
              <CalendarDays size={32} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm font-500 text-foreground">No slots on this date</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRecruiter ? 'Click "Add Slot" to create availability.' : 'Select another date to find open slots.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSlots.map(slot => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  tz={timezone}
                  isRecruiter={isRecruiter}
                  loading={actionLoading}
                  onBook={handleBook}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
