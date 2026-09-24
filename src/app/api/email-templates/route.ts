import { NextRequest } from 'next/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  badRequestResponse,
  serverErrorResponse,
  notFoundResponse,
} from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('email_templates')
      .select('*')
      .order('name', { ascending: true });
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ templates: data || [] });
  } catch {
    return serverErrorResponse();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const db = createServiceRoleClient();
    const id = body.id ? String(body.id) : '';
    const slug = sanitizeString(String(body.slug || '')).slice(0, 80).toLowerCase().replace(/\s+/g, '-');
    const name = sanitizeString(String(body.name || '')).slice(0, 120);
    const subject = sanitizeString(String(body.subject || '')).slice(0, 500);
    const bodyHtml = String(body.body_html || '').slice(0, 100000);

    if (id) {
      if (!isValidUUID(id)) return badRequestResponse('Invalid id');
      const { data, error } = await db
        .from('email_templates')
        .update({
          name: name || undefined,
          subject,
          body_html: bodyHtml,
          updated_at: new Date().toISOString(),
          updated_by: auth.user.id,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) return secureJson({ error: error.message }, 500);
      if (!data) return notFoundResponse('Template not found');
      return secureJson({ data });
    }

    if (!slug || !name) return badRequestResponse('slug and name required');
    const { data, error } = await db
      .from('email_templates')
      .upsert(
        {
          slug,
          name,
          subject,
          body_html: bodyHtml,
          updated_at: new Date().toISOString(),
          updated_by: auth.user.id,
        },
        { onConflict: 'slug' },
      )
      .select()
      .single();
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data });
  } catch {
    return serverErrorResponse();
  }
}
