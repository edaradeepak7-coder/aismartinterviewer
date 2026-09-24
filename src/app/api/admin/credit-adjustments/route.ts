import { NextRequest } from 'next/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { writeAuditLogServer } from '@/lib/security/auditLog';

const ADJ_TYPES = new Set(['grant', 'revoke', 'adjust']);

/**
 * GET /api/admin/credit-adjustments?batch_id=
 * Lists batches, or line items when batch_id is provided.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const db = createServiceRoleClient();
    const batchId = request.nextUrl.searchParams.get('batch_id');

    if (batchId) {
      if (!isValidUUID(batchId)) return badRequestResponse('Invalid batch_id');
      const { data, error } = await db
        .from('credit_adjustments')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });
      if (error) return secureJson({ error: error.message }, 500);
      return secureJson({ data: data || [] });
    }

    const { data, error } = await db
      .from('credit_adjustment_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data: data || [] });
  } catch {
    return serverErrorResponse();
  }
}

/**
 * POST /api/admin/credit-adjustments — create batch + line items
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;
    const { user, profile } = auth;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const batch_name = sanitizeString(String(body.batch_name || '')).slice(0, 200);
    const reason = sanitizeString(String(body.reason || '')).slice(0, 500);
    const adjustment_type = String(body.adjustment_type || 'grant');
    if (!batch_name || !reason) return badRequestResponse('batch_name and reason required');
    if (!ADJ_TYPES.has(adjustment_type)) return badRequestResponse('Invalid adjustment_type');

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) return badRequestResponse('rows required');

    const db = createServiceRoleClient();
    const { data: batch, error: batchErr } = await db
      .from('credit_adjustment_batches')
      .insert({
        batch_name,
        adjustment_type,
        reason,
        promotion_code: body.promotion_code
          ? sanitizeString(String(body.promotion_code)).slice(0, 60)
          : null,
        notes: body.notes ? sanitizeString(String(body.notes)).slice(0, 1000) : null,
        total_subscriptions: rows.length,
        csv_filename: body.csv_filename
          ? sanitizeString(String(body.csv_filename)).slice(0, 200)
          : null,
        csv_row_count: typeof body.csv_row_count === 'number' ? body.csv_row_count : rows.length,
        status: 'pending',
        created_by: user.id,
      })
      .select('*')
      .single();

    if (batchErr || !batch) {
      return secureJson({ error: batchErr?.message || 'Failed to create batch' }, 500);
    }

    const lineItems = rows.map((r: Record<string, unknown>) => {
      const credits = Math.abs(Number(r.credits || r.credits_delta || 0));
      return {
        batch_id: batch.id,
        user_email: sanitizeString(String(r.email || r.user_email || '')).slice(0, 254),
        adjustment_type,
        credits_delta: adjustment_type === 'revoke' ? -credits : credits,
        reason: sanitizeString(String(r.reason || reason)).slice(0, 500),
        status: 'pending',
      };
    });

    const { error: linesErr } = await db.from('credit_adjustments').insert(lineItems);
    if (linesErr) return secureJson({ error: linesErr.message }, 500);

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: profile.email ?? user.email,
        user_role: profile.role,
        action: 'credit_adjustment_batch_created',
        resource: 'credit_adjustment_batches',
        resource_id: batch.id,
        outcome: 'success',
        details: { rows: rows.length, adjustment_type },
      },
      auth.supabase,
    );

    return secureJson({ data: batch }, 201);
  } catch {
    return serverErrorResponse();
  }
}
