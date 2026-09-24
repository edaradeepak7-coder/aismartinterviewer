import { NextRequest } from 'next/server';
import { sanitizeString } from '@/lib/security/sanitize';
import {
  secureJson,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

const PLAN_MAP: Record<string, string> = {
  starter: 'Institution Basic',
  professional: 'Institution Pro',
  business: 'Institution Enterprise',
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const org = (body.org || {}) as Record<string, unknown>;
    const admin = (body.admin || {}) as Record<string, unknown>;
    const plan = (body.plan || {}) as Record<string, unknown>;

    const name = sanitizeString(String(org.name || '')).slice(0, 200);
    const email = sanitizeString(String(admin.email || org.email || '')).slice(0, 200);
    const contact = sanitizeString(String(admin.fullName || '')).slice(0, 200);

    if (!name) return badRequestResponse('Organization name required');
    if (!email) return badRequestResponse('Admin email required');

    const planId = String(plan.planId || 'professional');
    const seats = Math.max(1, Math.min(500, Number(plan.seats ?? 5) || 5));

    const notes = sanitizeString(
      [
        org.type ? `Type: ${org.type}` : '',
        org.city ? `City: ${org.city}` : '',
        org.country ? `Country: ${org.country}` : '',
        admin.email ? `Admin email: ${admin.email}` : '',
        admin.fullName ? `Admin contact: ${admin.fullName}` : '',
        admin.jobTitle ? `Admin title: ${admin.jobTitle}` : '',
        Array.isArray(body.team) ? `Team contacts noted: ${(body.team as unknown[]).length}` : '',
      ]
        .filter(Boolean)
        .join(' | '),
    ).slice(0, 1000);

    const db = createServiceRoleClient();
    const insertPayload: Record<string, unknown> = {
      name,
      email,
      contact_person: contact,
      phone: sanitizeString(String(org.phone || '')).slice(0, 40) || null,
      address: sanitizeString(String(org.address || '')).slice(0, 500) || null,
      website: sanitizeString(String(org.website || '')).slice(0, 300) || null,
      status: 'pending',
      total_seats: seats,
      used_seats: 0,
      plan: PLAN_MAP[planId] || 'Institution Pro',
      notes,
    };

    // Persist admin_email when column exists (migration optional)
    insertPayload.admin_email = email;

    let { data, error } = await db.from('institutions').insert(insertPayload).select().single();
    if (error && error.message?.includes('admin_email')) {
      const { admin_email: _ae, ...fallback } = insertPayload;
      ({ data, error } = await db.from('institutions').insert(fallback).select().single());
    }
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({
      institution: data,
      message: 'Institution created. Invite the admin from Users/RBAC.',
    }, 201);
  } catch {
    return serverErrorResponse();
  }
}
