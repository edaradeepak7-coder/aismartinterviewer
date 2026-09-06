'use client';

import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DBCandidate {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: string;
  department: string | null;
  experience_level: string | null;
  avatar_initials: string | null;
  created_at: string;
}

export interface DBInterview {
  id: string;
  candidate_id: string;
  recruiter_id: string | null;
  role: string;
  company: string;
  department: string | null;
  interview_type: 'technical' | 'behavioral' | 'mixed';
  status: 'scheduled' | 'in_progress' | 'completed' | 'evaluated' | 'archived';
  scheduled_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  question_count: number;
  answered_count: number;
  overall_score: number | null;
  technical_score: number | null;
  communication_score: number | null;
  role_alignment_score: number | null;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | null;
  ai_feedback_generated: boolean;
  created_at: string;
  candidates?: DBCandidate;
}

export interface DBQuestion {
  id: string;
  text: string;
  category: string;
  difficulty: string;
  technology: string | null;
  usage_count: number;
  is_active: boolean;
}

export interface DBResponse {
  id: string;
  interview_id: string;
  question_id: string;
  answer_text: string | null;
  answer_type: string;
  audio_url: string | null;
  submitted_at: string;
}

export interface DBInterviewResult {
  id: string;
  interview_id: string;
  final_score: number | null;
  recommendation: string | null;
  ai_summary: string | null;
  strengths: any[];
  improvements: any[];
  competencies: any[];
  ai_feedback: any[];
  transcript_highlights: any[];
  generated_at: string;
}

// ─── Candidate Service ────────────────────────────────────────────────────────

export const candidateService = {
  async getAll(): Promise<DBCandidate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('candidateService.getAll:', error.message); return []; }
    return data || [];
  },

  async getByUserId(userId: string): Promise<DBCandidate | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) { console.error('candidateService.getByUserId:', error.message); return null; }
    return data;
  },

  async upsert(candidate: Partial<DBCandidate> & { email: string; name: string }): Promise<DBCandidate | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('candidates')
      .upsert({ ...candidate, user_id: user.id }, { onConflict: 'email' })
      .select()
      .single();
    if (error) { console.error('candidateService.upsert:', error.message); return null; }
    return data;
  },
};

// ─── Interview Service ────────────────────────────────────────────────────────

export const interviewService = {
  async getAll(): Promise<DBInterview[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interviews')
      .select('*, candidates(id, name, email, avatar_initials, role)')
      .order('scheduled_at', { ascending: false });
    if (error) { console.error('interviewService.getAll:', error.message); return []; }
    return data || [];
  },

  async getById(id: string): Promise<DBInterview | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interviews')
      .select('*, candidates(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) { console.error('interviewService.getById:', error.message); return null; }
    return data;
  },

  async getByCandidateId(candidateId: string): Promise<DBInterview[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('scheduled_at', { ascending: false });
    if (error) { console.error('interviewService.getByCandidateId:', error.message); return []; }
    return data || [];
  },

  async getRecent(limit = 10): Promise<DBInterview[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interviews')
      .select('*, candidates(id, name, email, avatar_initials, role)')
      .order('scheduled_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('interviewService.getRecent:', error.message); return []; }
    return data || [];
  },

  async create(interview: Partial<DBInterview>): Promise<DBInterview | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interviews')
      .insert(interview)
      .select()
      .single();
    if (error) { console.error('interviewService.create:', error.message); return null; }
    return data;
  },

  async update(id: string, updates: Partial<DBInterview>): Promise<DBInterview | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('interviewService.update:', error.message); return null; }
    return data;
  },

  async getStats(): Promise<{
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    evaluated: number;
    avgScore: number;
    completionRate: number;
  }> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interviews')
      .select('status, overall_score');
    if (error || !data) {
      return { total: 0, scheduled: 0, inProgress: 0, completed: 0, evaluated: 0, avgScore: 0, completionRate: 0 };
    }
    const total = data.length;
    const scheduled = data.filter(i => i.status === 'scheduled').length;
    const inProgress = data.filter(i => i.status === 'in_progress').length;
    const completed = data.filter(i => i.status === 'completed').length;
    const evaluated = data.filter(i => i.status === 'evaluated').length;
    const scoredInterviews = data.filter(i => i.overall_score !== null);
    const avgScore = scoredInterviews.length
      ? Math.round(scoredInterviews.reduce((s, i) => s + (i.overall_score ?? 0), 0) / scoredInterviews.length)
      : 0;
    const completionRate = total > 0 ? Math.round(((completed + evaluated) / total) * 100) : 0;
    return { total, scheduled, inProgress, completed, evaluated, avgScore, completionRate };
  },
};

// ─── Question Service ─────────────────────────────────────────────────────────

export const questionService = {
  async getForInterview(interviewId: string): Promise<DBQuestion[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interview_questions')
      .select('question_order, questions(*)')
      .eq('interview_id', interviewId)
      .order('question_order', { ascending: true });
    if (error) { console.error('questionService.getForInterview:', error.message); return []; }
    return (data || []).map((row: any) => row.questions).filter(Boolean);
  },

  async getActive(): Promise<DBQuestion[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) { console.error('questionService.getActive:', error.message); return []; }
    return data || [];
  },

  async create(question: Partial<DBQuestion>): Promise<DBQuestion | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('questions')
      .insert(question)
      .select()
      .single();
    if (error) { console.error('questionService.create:', error.message); return null; }
    return data;
  },
};

// ─── Response Service ─────────────────────────────────────────────────────────

export const responseService = {
  async getByInterview(interviewId: string): Promise<DBResponse[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('interview_id', interviewId)
      .order('submitted_at', { ascending: true });
    if (error) { console.error('responseService.getByInterview:', error.message); return []; }
    return data || [];
  },

  async submitResponse(response: {
    interview_id: string;
    question_id: string;
    answer_text?: string;
    answer_type: 'text' | 'voice';
    audio_url?: string;
  }): Promise<DBResponse | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('responses')
      .insert(response)
      .select()
      .single();
    if (error) { console.error('responseService.submitResponse:', error.message); return null; }
    return data;
  },

  async bulkSubmit(responses: Array<{
    interview_id: string;
    question_id: string;
    answer_text?: string;
    answer_type: 'text' | 'voice';
  }>): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase.from('responses').insert(responses);
    if (error) { console.error('responseService.bulkSubmit:', error.message); return false; }
    return true;
  },
};

// ─── Interview Results Service ────────────────────────────────────────────────

export const interviewResultsService = {
  async getByInterviewId(interviewId: string): Promise<DBInterviewResult | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interview_results')
      .select('*')
      .eq('interview_id', interviewId)
      .maybeSingle();
    if (error) { console.error('interviewResultsService.getByInterviewId:', error.message); return null; }
    return data;
  },

  async upsert(result: Partial<DBInterviewResult> & { interview_id: string }): Promise<DBInterviewResult | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('interview_results')
      .upsert(result, { onConflict: 'interview_id' })
      .select()
      .single();
    if (error) { console.error('interviewResultsService.upsert:', error.message); return null; }
    return data;
  },
};
