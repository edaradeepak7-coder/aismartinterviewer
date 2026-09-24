'use client';

import { createClient } from '@/lib/supabase/client';
import { csrfHeaders } from '@/lib/api/apiClient';

export interface DBJobOffer {
  id: string;
  interview_id: string | null;
  candidate_id: string;
  recruiter_id: string | null;
  role: string;
  company: string;
  department: string | null;
  salary_range: string | null;
  start_date: string | null;
  offer_details: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  candidate_feedback: string | null;
  next_steps: any[];
  interview_prep_tips: any[];
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  candidates?: { name: string; email: string; avatar_initials: string | null };
}

export interface DBAvailabilitySlot {
  id: string;
  recruiter_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'available' | 'booked' | 'cancelled';
  notes: string | null;
  created_at: string;
  user_profiles?: { full_name: string; email: string };
}

export interface DBInterviewBooking {
  id: string;
  slot_id: string;
  candidate_id: string;
  interview_id: string | null;
  job_posting_id?: string | null;
  notes: string | null;
  confirmed: boolean;
  created_at: string;
  recruiter_availability?: DBAvailabilitySlot;
}

export type CreateJobOfferInput = {
  interview_id?: string | null;
  candidate_id: string;
  role: string;
  company?: string;
  department?: string | null;
  salary_range?: string | null;
  start_date?: string | null;
  offer_details?: string | null;
  expires_at?: string | null;
  next_steps?: unknown[];
  interview_prep_tips?: unknown[];
};

export const jobOfferService = {
  async create(input: CreateJobOfferInput): Promise<{ data: DBJobOffer | null; error?: string; reused?: boolean }> {
    try {
      const res = await fetch('/api/job-offers', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { data: null, error: json?.error || 'Failed to create offer' };
      }
      return { data: json.data || null, reused: Boolean(json.reused) };
    } catch (err) {
      console.error('jobOfferService.create:', err);
      return { data: null, error: err instanceof Error ? err.message : 'Failed to create offer' };
    }
  },

  async update(
    id: string,
    updates: Partial<{
      salary_range: string | null;
      start_date: string | null;
      offer_details: string | null;
      expires_at: string | null;
      next_steps: unknown[];
      interview_prep_tips: unknown[];
    }>,
  ): Promise<{ data: DBJobOffer | null; error?: string }> {
    try {
      const res = await fetch(`/api/job-offers/${id}`, {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updates),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { data: null, error: json?.error || 'Failed to update offer' };
      }
      return { data: json.data || null };
    } catch (err) {
      console.error('jobOfferService.update:', err);
      return { data: null, error: err instanceof Error ? err.message : 'Failed to update offer' };
    }
  },

  async getByCandidateId(candidateId: string): Promise<DBJobOffer[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    if (error) { console.error('jobOfferService.getByCandidateId:', error.message); return []; }
    return data || [];
  },

  async getById(id: string): Promise<DBJobOffer | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('job_offers')
      .select('*, candidates(name, email, avatar_initials)')
      .eq('id', id)
      .maybeSingle();
    if (error) { console.error('jobOfferService.getById:', error.message); return null; }
    return data;
  },

  async getAll(): Promise<DBJobOffer[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('job_offers')
      .select('*, candidates(name, email, avatar_initials)')
      .order('created_at', { ascending: false });
    if (error) { console.error('jobOfferService.getAll:', error.message); return []; }
    return data || [];
  },

  async respond(id: string, status: 'accepted' | 'declined', feedback?: string): Promise<DBJobOffer | null> {
    try {
      const res = await fetch(`/api/job-offers/${id}`, {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          status,
          candidate_feedback: feedback || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('jobOfferService.respond:', json?.error || res.status);
        return null;
      }
      return json.data || null;
    } catch (err) {
      console.error('jobOfferService.respond:', err);
      return null;
    }
  },

  async getByRecruiterId(recruiterId: string): Promise<DBJobOffer[]> {
    try {
      const res = await fetch(`/api/job-offers?recruiter_id=${encodeURIComponent(recruiterId)}`, {
        headers: csrfHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('jobOfferService.getByRecruiterId:', json?.error || res.status);
        return [];
      }
      return json.data || [];
    } catch (err) {
      console.error('jobOfferService.getByRecruiterId:', err);
      return [];
    }
  },
};

export const availabilityService = {
  async getAvailableSlots(recruiterId?: string): Promise<DBAvailabilitySlot[]> {
    const supabase = createClient();
    let query = supabase
      .from('recruiter_availability')
      .select('*, user_profiles(full_name, email)')
      .eq('status', 'available')
      .gte('slot_date', new Date().toISOString().split('T')[0])
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });
    if (recruiterId) query = query.eq('recruiter_id', recruiterId);
    const { data, error } = await query;
    if (error) { console.error('availabilityService.getAvailableSlots:', error.message); return []; }
    return data || [];
  },

  async getAllSlots(recruiterId?: string): Promise<DBAvailabilitySlot[]> {
    const supabase = createClient();
    let query = supabase
      .from('recruiter_availability')
      .select('*, user_profiles(full_name, email)')
      .gte('slot_date', new Date().toISOString().split('T')[0])
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });
    if (recruiterId) query = query.eq('recruiter_id', recruiterId);
    const { data, error } = await query;
    if (error) { console.error('availabilityService.getAllSlots:', error.message); return []; }
    return data || [];
  },
};

export const bookingService = {
  async create(booking: {
    slot_id: string;
    candidate_id: string;
    interview_id?: string;
    notes?: string;
    job_posting_id?: string;
    confirmed?: boolean;
  }): Promise<DBInterviewBooking | null> {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...booking,
          confirmed: booking.confirmed !== false,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('bookingService.create:', json?.error || res.status);
        return null;
      }
      return json.data || null;
    } catch (err) {
      console.error('bookingService.create:', err);
      return null;
    }
  },

  async getByCandidateId(candidateId: string): Promise<DBInterviewBooking[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interview_bookings')
      .select('*, recruiter_availability(*, user_profiles(full_name, email))')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    if (error) { console.error('bookingService.getByCandidateId:', error.message); return []; }
    return data || [];
  },
};
