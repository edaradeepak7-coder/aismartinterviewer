import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid interview id');

    const { data, error } = await supabase
      .from('interviews')
      .select('*, candidates(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) return secureJson({ error: 'Failed to load interview' }, 500);
    if (!data) return notFoundResponse('Interview not found');

    return secureJson({ data });
  } catch (err) {
    console.error('interviews GET [id]:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid interview id');

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const { data: existing, error: loadErr } = await supabase
      .from('interviews')
      .select('id, candidate_id, recruiter_id, role, company, status, candidate_confirmed')
      .eq('id', id)
      .maybeSingle();

    if (loadErr) return secureJson({ error: 'Failed to load interview' }, 500);
    if (!existing) return notFoundResponse('Interview not found');

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, user_id, name')
      .eq('id', existing.candidate_id)
      .maybeSingle();

    const isCandidateOwner = candidate?.user_id === user.id;
    const isRecruiterOwner = existing.recruiter_id === user.id;

    const wantsConfirm = body.candidate_confirmed === true;
    const wantsDecline = sanitizeString(String(body.status ?? '')) === 'archived';
    const isInviteResponse = wantsConfirm || wantsDecline;

    if (isInviteResponse && !isCandidateOwner) {
      return forbiddenResponse('Only the invited candidate can respond to this invitation');
    }
    if (!isInviteResponse && !isRecruiterOwner && !isCandidateOwner) {
      // Allow recruiters/admins updating scores etc. if they own the row; candidates rarely need other fields
      if (!isRecruiterOwner) {
        return forbiddenResponse('Not allowed to update this interview');
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (wantsConfirm) {
      if (existing.status === 'archived') {
        return badRequestResponse('Cannot accept a declined invitation');
      }
      updates.candidate_confirmed = true;
      updates.candidate_responded_at = new Date().toISOString();
      // Keep status as scheduled (or leave in_progress alone if already live)
      if (existing.status === 'scheduled') {
        // no status change
      }
    } else if (wantsDecline) {
      updates.status = 'archived';
      updates.candidate_confirmed = false;
      updates.candidate_responded_at = new Date().toISOString();
    } else {
      const allowedFields = [
        'status',
        'completed_at',
        'duration_minutes',
        'question_count',
        'answered_count',
        'overall_score',
        'technical_score',
        'communication_score',
        'role_alignment_score',
        'recommendation',
        'ai_feedback_generated',
        'scheduled_at',
        'department',
        'interview_type',
        'recruiter_notes',
        'recording_url',
      ] as const;
      for (const key of allowedFields) {
        if (key in body) updates[key] = body[key];
      }
    }

    const { data, error } = await supabase
      .from('interviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('interviews PATCH:', error.message);
      // Soft hint when migration not applied
      if (error.message?.includes('candidate_confirmed')) {
        return secureJson(
          { error: 'candidate_confirmed column missing — apply interview_candidate_confirm migration' },
          500,
        );
      }
      return secureJson({ error: 'Failed to update interview' }, 500);
    }

    if (isInviteResponse && existing.recruiter_id) {
      try {
        const name = candidate?.name || 'A candidate';
        await supabase.from('notifications').insert({
          user_id: existing.recruiter_id,
          type: 'system',
          title: wantsConfirm ? 'Invitation accepted' : 'Invitation declined',
          message: wantsConfirm
            ? `${name} accepted the interview for ${existing.role} at ${existing.company}.`
            : `${name} declined the interview for ${existing.role} at ${existing.company}.`,
          is_read: false,
          action_url: '/recruiter-calendar',
          metadata: {
            interview_id: id,
            candidate_id: existing.candidate_id,
            source: wantsConfirm ? 'invitation_accepted' : 'invitation_declined',
          },
        });
      } catch (notifErr) {
        console.warn('interview invite notify:', notifErr);
      }
    }

    return secureJson({ data });
  } catch (err) {
    console.error('interviews PATCH [id]:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid interview id');

    const { data: existing } = await supabase
      .from('interviews')
      .select('recruiter_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return notFoundResponse('Interview not found');
    if (existing.recruiter_id && existing.recruiter_id !== user.id) {
      return forbiddenResponse('Only the recruiter can delete this interview');
    }

    const { error } = await supabase.from('interviews').delete().eq('id', id);
    if (error) return secureJson({ error: 'Failed to delete interview' }, 500);

    return secureJson({ success: true });
  } catch (err) {
    console.error('interviews DELETE [id]:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
