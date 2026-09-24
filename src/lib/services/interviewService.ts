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
  /** Private recruiter scratchpad — never expose to candidates. */
  recruiter_notes?: string | null;
  /** Storage path or https URL for session recording. */
  recording_url?: string | null;
  /** Candidate accepted the scheduled invitation (not the same as in_progress). */
  candidate_confirmed?: boolean;
  candidate_responded_at?: string | null;
  /** Job posting this interview was booked/applied for. */
  job_posting_id?: string | null;
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

  /** Recruiter live room: reuse exact name match, else create a session-scoped row. */
  async findOrCreateForSession(params: {
    name: string;
    role?: string;
    department?: string | null;
    sessionKey: string;
  }): Promise<DBCandidate | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const trimmed = params.name.trim();
    if (!trimmed) return null;

    const { data: matches, error: findErr } = await supabase
      .from('candidates')
      .select('*')
      .ilike('name', trimmed)
      .limit(20);
    if (findErr) console.error('candidateService.findOrCreateForSession find:', findErr.message);

    const exact = (matches || []).find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exact) return exact;

    const slug = params.sessionKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toLowerCase() || 'room';
    const email = `live-${slug}@session.local`;
    const { data, error } = await supabase
      .from('candidates')
      .upsert(
        {
          name: trimmed,
          email,
          role: params.role || '',
          department: params.department || null,
          user_id: user.id,
        },
        { onConflict: 'email' },
      )
      .select()
      .single();
    if (error) { console.error('candidateService.findOrCreateForSession:', error.message); return null; }
    return data;
  },
};

// ─── Recruiter Candidate Meta (bookmarks / tags) ──────────────────────────────

export interface RecruiterCandidateMeta {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  saved: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const RCM_FALLBACK_TITLE = '__recruiter_candidate_meta__';
type MetaMap = Record<string, { saved: boolean; tags: string[] }>;
let rcmTableAvailable: boolean | null = null;

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST205' || /recruiter_candidate_meta/i.test(error.message || '');
}

function mapFromMetadata(meta: unknown): MetaMap {
  if (!meta || typeof meta !== 'object') return {};
  const map = (meta as { map?: MetaMap }).map;
  return map && typeof map === 'object' ? map : {};
}

async function listMetaFallback(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<RecruiterCandidateMeta[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, metadata, created_at')
    .eq('user_id', userId)
    .eq('title', RCM_FALLBACK_TITLE)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('recruiterCandidateMetaService.fallback.list:', error.message);
    return [];
  }
  const map = mapFromMetadata(data?.metadata);
  const now = data?.created_at || new Date().toISOString();
  return Object.entries(map).map(([candidate_id, v]) => ({
    id: `${data?.id || 'fallback'}:${candidate_id}`,
    recruiter_id: userId,
    candidate_id,
    saved: !!v.saved,
    tags: Array.isArray(v.tags) ? v.tags : [],
    created_at: now,
    updated_at: now,
  }));
}

async function upsertMetaFallback(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  candidateId: string,
  patch: { saved?: boolean; tags?: string[] },
): Promise<RecruiterCandidateMeta | null> {
  const { data: existing } = await supabase
    .from('notifications')
    .select('id, metadata')
    .eq('user_id', userId)
    .eq('title', RCM_FALLBACK_TITLE)
    .limit(1)
    .maybeSingle();

  const map = mapFromMetadata(existing?.metadata);
  const prev = map[candidateId] || { saved: false, tags: [] };
  map[candidateId] = {
    saved: patch.saved ?? prev.saved,
    tags: patch.tags ?? prev.tags,
  };

  const payload = {
    user_id: userId,
    type: 'system' as const,
    title: RCM_FALLBACK_TITLE,
    message: 'Recruiter candidate bookmarks and tags',
    is_read: true,
    metadata: { map },
  };

  let rowId = existing?.id;
  if (existing?.id) {
    const { error } = await supabase
      .from('notifications')
      .update({ metadata: { map } })
      .eq('id', existing.id);
    if (error) {
      console.error('recruiterCandidateMetaService.fallback.update:', error.message);
      return null;
    }
  } else {
    const { data, error } = await supabase.from('notifications').insert(payload).select('id').single();
    if (error) {
      console.error('recruiterCandidateMetaService.fallback.insert:', error.message);
      return null;
    }
    rowId = data.id;
  }

  const now = new Date().toISOString();
  return {
    id: `${rowId}:${candidateId}`,
    recruiter_id: userId,
    candidate_id: candidateId,
    saved: map[candidateId].saved,
    tags: map[candidateId].tags,
    created_at: now,
    updated_at: now,
  };
}

export const recruiterCandidateMetaService = {
  async listForCurrentUser(): Promise<RecruiterCandidateMeta[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    if (rcmTableAvailable !== false) {
      const { data, error } = await supabase
        .from('recruiter_candidate_meta')
        .select('*')
        .eq('recruiter_id', user.id);
      if (!error) {
        rcmTableAvailable = true;
        return (data || []).map((row) => ({
          ...row,
          tags: Array.isArray(row.tags) ? row.tags : [],
        }));
      }
      if (isMissingTableError(error)) {
        rcmTableAvailable = false;
      } else {
        console.error('recruiterCandidateMetaService.list:', error.message);
        return [];
      }
    }

    return listMetaFallback(supabase, user.id);
  },

  async upsert(candidateId: string, patch: { saved?: boolean; tags?: string[] }): Promise<RecruiterCandidateMeta | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    if (rcmTableAvailable !== false) {
      const { data: existing, error: existingErr } = await supabase
        .from('recruiter_candidate_meta')
        .select('*')
        .eq('recruiter_id', user.id)
        .eq('candidate_id', candidateId)
        .maybeSingle();

      if (isMissingTableError(existingErr)) {
        rcmTableAvailable = false;
      } else {
        rcmTableAvailable = true;
        const row = {
          recruiter_id: user.id,
          candidate_id: candidateId,
          saved: patch.saved ?? existing?.saved ?? false,
          tags: patch.tags ?? (Array.isArray(existing?.tags) ? existing.tags : []),
        };

        const { data, error } = await supabase
          .from('recruiter_candidate_meta')
          .upsert(row, { onConflict: 'recruiter_id,candidate_id' })
          .select()
          .single();
        if (!error && data) {
          return {
            ...data,
            tags: Array.isArray(data.tags) ? data.tags : [],
          };
        }
        if (isMissingTableError(error)) {
          rcmTableAvailable = false;
        } else {
          console.error('recruiterCandidateMetaService.upsert:', error?.message);
          return null;
        }
      }
    }

    return upsertMetaFallback(supabase, user.id, candidateId, patch);
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
    // Explicit columns — omit recruiter_notes (private to recruiter)
    const withConfirm = `
        id, candidate_id, recruiter_id, role, company, department, interview_type,
        status, scheduled_at, completed_at, duration_minutes, question_count, answered_count,
        overall_score, technical_score, communication_score, role_alignment_score,
        recommendation, ai_feedback_generated, created_at,
        candidate_confirmed, candidate_responded_at
      `;
    const withoutConfirm = `
        id, candidate_id, recruiter_id, role, company, department, interview_type,
        status, scheduled_at, completed_at, duration_minutes, question_count, answered_count,
        overall_score, technical_score, communication_score, role_alignment_score,
        recommendation, ai_feedback_generated, created_at
      `;
    let { data, error } = await supabase
      .from('interviews')
      .select(withConfirm)
      .eq('candidate_id', candidateId)
      .order('scheduled_at', { ascending: false });
    if (error && /candidate_confirmed|candidate_responded_at/i.test(error.message)) {
      ({ data, error } = await supabase
        .from('interviews')
        .select(withoutConfirm)
        .eq('candidate_id', candidateId)
        .order('scheduled_at', { ascending: false }));
    }
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
  async getByInterview(interviewId: string): Promise<(DBResponse & { question_text?: string })[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('responses')
      .select('*, questions(id, text, category, difficulty)')
      .eq('interview_id', interviewId)
      .order('submitted_at', { ascending: true });
    if (error) { console.error('responseService.getByInterview:', error.message); return []; }
    return (data || []).map((row: any) => ({
      ...row,
      question_text: row.questions?.text || undefined,
    }));
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
