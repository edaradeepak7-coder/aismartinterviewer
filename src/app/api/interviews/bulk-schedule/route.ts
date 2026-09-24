import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID, parseIntSafe } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

/**
 * POST /api/interviews/bulk-schedule
 * Body: { candidate_ids: string[], scheduled_at: string, role?, company?, department?, interview_type?, duration_minutes? }
 * Creates one scheduled interview per candidate and notifies linked user accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const candidateIdsRaw = Array.isArray(body.candidate_ids) ? body.candidate_ids : [];
    const candidate_ids = candidateIdsRaw
      .map((id: unknown) => sanitizeString(String(id ?? '')))
      .filter((id: string) => isValidUUID(id));

    if (candidate_ids.length === 0) {
      return badRequestResponse('candidate_ids must include at least one valid UUID');
    }
    if (candidate_ids.length > 50) {
      return badRequestResponse('Maximum 50 candidates per bulk schedule');
    }

    const scheduled_at = sanitizeString(body.scheduled_at);
    if (!scheduled_at) return badRequestResponse('scheduled_at is required');
    const scheduledDate = new Date(scheduled_at);
    if (Number.isNaN(scheduledDate.getTime())) {
      return badRequestResponse('Invalid scheduled_at');
    }
    if (scheduledDate.getTime() < Date.now() - 60_000) {
      return badRequestResponse('scheduled_at must be in the future');
    }

    const role = sanitizeString(body.role) || 'Interview';
    const company = sanitizeString(body.company) || 'Triveda';
    const department = body.department ? sanitizeString(body.department) : null;
    const interview_type = sanitizeString(body.interview_type) || 'mixed';
    const duration_minutes = parseIntSafe(body.duration_minutes, 45, 15, 180);

    const ALLOWED_TYPES = ['technical', 'behavioral', 'mixed', 'coding'] as const;
    if (!ALLOWED_TYPES.includes(interview_type as any)) {
      return badRequestResponse('Invalid interview_type');
    }

    const { data: candidates, error: candErr } = await supabase
      .from('candidates')
      .select('id, name, email, user_id, role')
      .in('id', candidate_ids);

    if (candErr) return secureJson({ error: 'Failed to load candidates' }, 500);

    const found = candidates || [];
    const foundIds = new Set(found.map((c) => c.id));
    const missing = candidate_ids.filter((id: string) => !foundIds.has(id));

    const rows = found.map((c) => ({
      candidate_id: c.id,
      recruiter_id: user.id,
      role: role || c.role || 'Interview',
      company,
      department,
      interview_type,
      status: 'scheduled' as const,
      scheduled_at: scheduledDate.toISOString(),
      duration_minutes,
      question_count: 0,
      answered_count: 0,
    }));

    const { data: created, error: insertErr } = await supabase
      .from('interviews')
      .insert(rows)
      .select('id, candidate_id, scheduled_at, role, status');

    if (insertErr) {
      console.error('bulk-schedule insert:', insertErr.message);
      return secureJson({ error: 'Failed to create interviews' }, 500);
    }

    const createdRows = created || [];
    const byCandidate = new Map(found.map((c) => [c.id, c]));

    // Best-effort in-app notifications for candidates with linked accounts
    const notifications = createdRows
      .map((iv) => {
        const cand = byCandidate.get(iv.candidate_id);
        if (!cand?.user_id) return null;
        const when = new Date(iv.scheduled_at).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        return {
          user_id: cand.user_id,
          type: 'interview_scheduled' as const,
          title: 'Interview scheduled',
          message: `You have been scheduled for ${iv.role} on ${when}.`,
          is_read: false,
          action_url: '/invitations',
          metadata: { interview_id: iv.id, candidate_id: iv.candidate_id },
        };
      })
      .filter(Boolean);

    let notified = 0;
    if (notifications.length) {
      const { data: notifRows, error: notifErr } = await supabase
        .from('notifications')
        .insert(notifications)
        .select('id');
      if (notifErr) {
        console.warn('bulk-schedule notify:', notifErr.message);
      } else {
        notified = notifRows?.length || 0;
      }
    }

    return secureJson({
      data: {
        created: createdRows.length,
        missing,
        notified,
        interviews: createdRows,
      },
    }, 201);
  } catch (err) {
    console.error('bulk-schedule error:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
