'use client';

import { createClient } from '@/lib/supabase/client';
import type { ProctoringEvent, ProctoringInsights } from '@/components/ProctoringEngine';
import { computeInsights } from '@/components/ProctoringEngine';

export interface ProctoringRiskSummary {
  interviewId: string;
  riskLevel: 'clean' | 'low' | 'medium' | 'high';
  score: number;
  eventCount: number;
}

function mapUiRiskToDashboard(
  level: ProctoringInsights['riskLevel'],
  score: number,
): 'low' | 'medium' | 'high' | 'critical' | null {
  if (level === 'clean' && score < 10) return null;
  if (score >= 75 || level === 'high') return score >= 75 ? 'critical' : 'high';
  if (level === 'medium' || score >= 30) return 'medium';
  if (level === 'low' || score >= 10) return 'low';
  return null;
}

export const proctoringService = {
  /**
   * Batch-insert proctoring events. Requires auth (RLS: user_id = auth.uid()).
   * Pass interviewId when known so recruiters can aggregate by interview.
   */
  async flushEvents(
    events: ProctoringEvent[],
    opts: { sessionId: string; interviewId?: string | null },
  ): Promise<{ inserted: number; error?: string }> {
    if (!events.length || !opts.sessionId) return { inserted: 0 };

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { inserted: 0, error: 'not_authenticated' };

    // Dedupe by type+timestamp to avoid double-flush
    const rows = events.map((e) => ({
      session_id: opts.sessionId,
      user_id: user.id,
      interview_id: opts.interviewId || null,
      event_type: e.type,
      severity: e.severity,
      detail: (e.detail || '').slice(0, 500),
      occurred_at: e.timestamp || new Date().toISOString(),
    }));

    const { error, data } = await supabase
      .from('proctoring_events')
      .insert(rows)
      .select('id');

    if (error) {
      console.error('proctoringService.flushEvents:', error.message);
      return { inserted: 0, error: error.message };
    }
    return { inserted: data?.length || rows.length };
  },

  async getRiskByInterviewIds(
    interviewIds: string[],
  ): Promise<Record<string, ProctoringRiskSummary>> {
    const out: Record<string, ProctoringRiskSummary> = {};
    if (!interviewIds.length) return out;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('proctoring_events')
      .select('interview_id, event_type, severity, detail, occurred_at')
      .in('interview_id', interviewIds)
      .limit(2000);

    if (error) {
      console.error('proctoringService.getRiskByInterviewIds:', error.message);
      return out;
    }

    const byInterview: Record<string, ProctoringEvent[]> = {};
    (data || []).forEach((row: any) => {
      if (!row.interview_id) return;
      if (!byInterview[row.interview_id]) byInterview[row.interview_id] = [];
      byInterview[row.interview_id].push({
        type: row.event_type,
        severity: row.severity || 'low',
        detail: row.detail || '',
        timestamp: row.occurred_at,
      });
    });

    Object.entries(byInterview).forEach(([interviewId, events]) => {
      const insights = computeInsights(events);
      out[interviewId] = {
        interviewId,
        riskLevel: insights.riskLevel,
        score: insights.overallRiskScore,
        eventCount: events.length,
      };
    });

    return out;
  },

  summarizeForDashboard(summary: ProctoringRiskSummary | undefined): 'low' | 'medium' | 'high' | 'critical' | null {
    if (!summary) return null;
    return mapUiRiskToDashboard(summary.riskLevel, summary.score);
  },
};
