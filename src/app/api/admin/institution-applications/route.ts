import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidEmail } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'org_admin', 'institution_admin']);
const STATUSES = new Set(['pending', 'approved', 'rejected', 'under_review']);

/**
 * GET /api/admin/institution-applications?status=
 * POST — public/authenticated intake for a new application
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !ADMIN_ROLES.has(profile.role)) return forbiddenResponse();

    const status = request.nextUrl.searchParams.get('status');
    if (status && status !== 'all' && !STATUSES.has(status)) {
      return badRequestResponse('Invalid status');
    }

    let query = supabase
      .from('institution_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return secureJson({ error: error.message }, 500);

    return secureJson({ data: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const institution_name = sanitizeString(String(body.institution_name ?? '')).slice(0, 200);
    const contact_name = sanitizeString(String(body.contact_name ?? '')).slice(0, 120);
    const contact_email = sanitizeString(String(body.contact_email ?? '')).toLowerCase().slice(0, 254);
    const contact_phone = sanitizeString(String(body.contact_phone ?? '')).slice(0, 40) || null;
    const institution_type = sanitizeString(String(body.institution_type ?? 'Engineering')).slice(0, 80);
    const address = sanitizeString(String(body.address ?? '')).slice(0, 500) || null;
    const website = sanitizeString(String(body.website ?? '')).slice(0, 300) || null;
    const seats_requested =
      typeof body.seats_requested === 'number'
        ? Math.min(10000, Math.max(1, Math.floor(body.seats_requested)))
        : 50;
    const payment_method =
      body.payment_method === 'online' || body.payment_method === 'offline'
        ? body.payment_method
        : 'offline';
    const payment_reference =
      sanitizeString(String(body.payment_reference ?? '')).slice(0, 120) || null;
    const payment_amount =
      typeof body.payment_amount === 'number' ? Math.max(0, body.payment_amount) : null;
    const bank_name = sanitizeString(String(body.bank_name ?? '')).slice(0, 120) || null;
    const transfer_date = sanitizeString(String(body.transfer_date ?? '')).slice(0, 20) || null;
    const notes = sanitizeString(String(body.notes ?? '')).slice(0, 2000) || null;

    if (!institution_name) return badRequestResponse('institution_name is required');
    if (!contact_name) return badRequestResponse('contact_name is required');
    if (!isValidEmail(contact_email)) return badRequestResponse('Valid contact_email is required');

    const { data, error } = await supabase
      .from('institution_applications')
      .insert({
        institution_name,
        contact_name,
        contact_email,
        contact_phone,
        institution_type,
        address,
        website,
        seats_requested,
        payment_method,
        payment_reference,
        payment_amount,
        bank_name,
        transfer_date: transfer_date || null,
        notes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}
