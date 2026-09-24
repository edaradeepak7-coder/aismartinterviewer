import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';
import { writeAuditLogServer } from '@/lib/security/auditLog';
import { sendTransactionalEmail } from '@/lib/email/sendTransactional';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'org_admin']);

/**
 * PATCH /api/admin/institution-applications/[id]
 * Body: { action: 'approve'|'reject'|'under_review', seats_allocated?, rejection_reason?, notes? }
 */
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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !ADMIN_ROLES.has(profile.role)) return forbiddenResponse();

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid application id');

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const action = sanitizeString(String(body.action ?? ''));
    if (!['approve', 'reject', 'under_review'].includes(action)) {
      return badRequestResponse('action must be approve, reject, or under_review');
    }

    const { data: app, error: fetchErr } = await supabase
      .from('institution_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) return secureJson({ error: fetchErr.message }, 500);
    if (!app) return secureJson({ error: 'Application not found' }, 404);

    if (app.status === 'approved' || app.status === 'rejected') {
      return badRequestResponse(`Application already ${app.status}`);
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    };

    if (action === 'under_review') {
      updates.status = 'under_review';
      if (body.notes) updates.notes = sanitizeString(String(body.notes)).slice(0, 2000);
    } else if (action === 'reject') {
      const reason = sanitizeString(String(body.rejection_reason ?? '')).slice(0, 2000);
      if (!reason) return badRequestResponse('rejection_reason is required');
      updates.status = 'rejected';
      updates.rejection_reason = reason;
    } else {
      // approve
      const seats =
        typeof body.seats_allocated === 'number'
          ? Math.min(10000, Math.max(1, Math.floor(body.seats_allocated)))
          : Number(app.seats_requested) || 50;
      updates.status = 'approved';
      updates.seats_allocated = seats;
      updates.rejection_reason = null;

      // Upsert institution record with allocated seats
      const email = String(app.contact_email || '').toLowerCase();
      const { data: existing } = await supabase
        .from('institutions')
        .select('id, total_seats')
        .eq('email', email)
        .maybeSingle();

      if (existing?.id) {
        const { error: instErr } = await supabase
          .from('institutions')
          .update({
            name: app.institution_name,
            contact_person: app.contact_name,
            phone: app.contact_phone,
            address: app.address,
            website: app.website,
            status: 'approved',
            total_seats: Math.max(Number(existing.total_seats) || 0, seats),
            approved_by: user.id,
            approved_at: now,
            notes: app.notes || null,
            updated_at: now,
          })
          .eq('id', existing.id);
        if (instErr) return secureJson({ error: instErr.message }, 500);
      } else {
        const { error: instErr } = await supabase.from('institutions').insert({
          name: app.institution_name,
          email,
          contact_person: app.contact_name || '',
          phone: app.contact_phone,
          address: app.address,
          website: app.website,
          status: 'approved',
          total_seats: seats,
          used_seats: 0,
          plan: 'Institution Basic',
          approved_by: user.id,
          approved_at: now,
          notes: app.notes || null,
        });
        if (instErr) {
          // Unique race: retry update
          if (/unique|duplicate/i.test(instErr.message)) {
            await supabase
              .from('institutions')
              .update({
                status: 'approved',
                total_seats: seats,
                approved_by: user.id,
                approved_at: now,
              })
              .eq('email', email);
          } else {
            return secureJson({ error: instErr.message }, 500);
          }
        }
      }
    }

    const { data: updated, error: updErr } = await supabase
      .from('institution_applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updErr) return secureJson({ error: updErr.message }, 500);

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: profile.email || user.email,
        user_role: profile.role,
        action: action === 'approve' ? 'data_updated' : action === 'reject' ? 'data_updated' : 'data_accessed',
        resource: 'institution_applications',
        resource_id: id,
        outcome: 'success',
        details: {
          resource_label: app.institution_name,
          review_action: action,
          seats_allocated: updates.seats_allocated ?? null,
          rejection_reason: updates.rejection_reason ?? null,
          change_diffs:
            action === 'approve'
              ? [
                  { field: 'status', before: app.status, after: 'approved' },
                  {
                    field: 'seats_allocated',
                    before: String(app.seats_allocated ?? 'null'),
                    after: String(updates.seats_allocated),
                  },
                ]
              : action === 'reject'
                ? [{ field: 'status', before: app.status, after: 'rejected' }]
                : [{ field: 'status', before: app.status, after: 'under_review' }],
        },
      },
      supabase,
    );

    // Notify applicant (best-effort)
    if (app.contact_email && (action === 'approve' || action === 'reject')) {
      const subject =
        action === 'approve'
          ? `Institution application approved — ${app.institution_name}`
          : `Institution application update — ${app.institution_name}`;
      const textBody =
        action === 'approve'
          ? [
              `Hi ${app.contact_name},`,
              '',
              `Your application for ${app.institution_name} has been approved.`,
              `Seats allocated: ${updates.seats_allocated}`,
              '',
              'You can sign in to the institution admin portal to manage seats and candidates.',
              '',
              '— Triveda AI Interview Platform',
            ].join('\n')
          : [
              `Hi ${app.contact_name},`,
              '',
              `Your application for ${app.institution_name} was not approved.`,
              `Reason: ${updates.rejection_reason}`,
              '',
              'Reply to this email if you have questions.',
              '',
              '— Triveda AI Interview Platform',
            ].join('\n');
      await sendTransactionalEmail(String(app.contact_email), subject, textBody);
    }

    return secureJson({ data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}
