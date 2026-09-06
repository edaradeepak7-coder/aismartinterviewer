import { createClient } from '@/lib/supabase/client';

export interface RecruiterFeedback {
  id: string;
  interview_id: string;
  candidate_id: string;
  recruiter_id: string;
  strengths: string;
  gaps: string;
  recommendation_notes: string;
  overall_recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | null;
  is_confidential: boolean;
  created_at: string;
  updated_at: string;
  interviews?: { role: string; scheduled_at: string };
  candidates?: { name: string; email: string };
}

export interface FeedbackFormData {
  interview_id: string;
  candidate_id: string;
  strengths: string;
  gaps: string;
  recommendation_notes: string;
  overall_recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  is_confidential: boolean;
}

export const feedbackService = {
  async getAll(): Promise<RecruiterFeedback[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recruiter_feedback')
      .select('*, interviews(role, scheduled_at), candidates(name, email)')
      .order('created_at', { ascending: false });
    if (error) { console.error('feedbackService.getAll:', error.message); return []; }
    return data || [];
  },

  async getByInterview(interviewId: string): Promise<RecruiterFeedback | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recruiter_feedback')
      .select('*, interviews(role, scheduled_at), candidates(name, email)')
      .eq('interview_id', interviewId)
      .maybeSingle();
    if (error) { console.error('feedbackService.getByInterview:', error.message); return null; }
    return data;
  },

  async getByCandidate(candidateId: string): Promise<RecruiterFeedback[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recruiter_feedback')
      .select('*, interviews(role, scheduled_at)')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    if (error) { console.error('feedbackService.getByCandidate:', error.message); return []; }
    return data || [];
  },

  async submit(form: FeedbackFormData): Promise<RecruiterFeedback | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('recruiter_feedback')
      .insert({ ...form, recruiter_id: user.id })
      .select()
      .single();
    if (error) { console.error('feedbackService.submit:', error.message); return null; }
    return data;
  },

  async update(id: string, updates: Partial<FeedbackFormData>): Promise<RecruiterFeedback | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recruiter_feedback')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('feedbackService.update:', error.message); return null; }
    return data;
  },
};
