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
      .from('ai_provider_configs')
      .select('*')
      .order('display_name', { ascending: true });
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ providers: data || [] });
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

    // Bulk update array
    if (Array.isArray(body.providers)) {
      const results = [];
      for (const p of body.providers as Record<string, unknown>[]) {
        const id = String(p.id || '');
        const providerKey = sanitizeString(String(p.provider_key || '')).slice(0, 80);
        if (id && isValidUUID(id)) {
          const { data, error } = await db
            .from('ai_provider_configs')
            .update({
              display_name: sanitizeString(String(p.display_name || '')).slice(0, 120) || undefined,
              enabled: typeof p.enabled === 'boolean' ? p.enabled : undefined,
              config: p.config && typeof p.config === 'object' ? p.config : undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();
          if (!error && data) results.push(data);
        } else if (providerKey) {
          const { data, error } = await db
            .from('ai_provider_configs')
            .upsert(
              {
                provider_key: providerKey,
                display_name: sanitizeString(String(p.display_name || providerKey)).slice(0, 120),
                enabled: Boolean(p.enabled ?? true),
                config: (p.config as object) || {},
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'provider_key' },
            )
            .select()
            .single();
          if (!error && data) results.push(data);
        }
      }
      return secureJson({ providers: results });
    }

    const id = body.id ? String(body.id) : '';
    if (id) {
      if (!isValidUUID(id)) return badRequestResponse('Invalid id');
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof body.display_name === 'string')
        updates.display_name = sanitizeString(body.display_name).slice(0, 120);
      if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
      if (body.config && typeof body.config === 'object') updates.config = body.config;

      const { data, error } = await db
        .from('ai_provider_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) return secureJson({ error: error.message }, 500);
      if (!data) return notFoundResponse('Provider not found');
      return secureJson({ data });
    }

    const providerKey = sanitizeString(String(body.provider_key || '')).slice(0, 80);
    if (!providerKey) return badRequestResponse('provider_key or id required');

    const { data, error } = await db
      .from('ai_provider_configs')
      .upsert(
        {
          provider_key: providerKey,
          display_name: sanitizeString(String(body.display_name || providerKey)).slice(0, 120),
          enabled: Boolean(body.enabled ?? true),
          config: (body.config as object) || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider_key' },
      )
      .select()
      .single();
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data });
  } catch {
    return serverErrorResponse();
  }
}
