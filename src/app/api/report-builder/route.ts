import { NextRequest } from 'next/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const previewId = request.nextUrl.searchParams.get('preview');
    const db = createServiceRoleClient();

    if (previewId) {
      if (!isValidUUID(previewId)) return badRequestResponse('Invalid id');
      const { data, error } = await db
        .from('report_definitions')
        .select('*')
        .eq('id', previewId)
        .maybeSingle();
      if (error) return secureJson({ error: error.message }, 500);
      if (!data) return secureJson({ error: 'Not found' }, 404);

      const config = (data.config || {}) as Record<string, unknown>;
      const metrics = Array.isArray(config.metrics) ? config.metrics : [];
      // Honest empty/sample structure — no fake metric values
      return secureJson({
        report: data,
        preview: {
          name: data.name,
          chartType: config.chartType || 'bar',
          metrics: metrics.map((m: unknown) => ({
            id: typeof m === 'string' ? m : (m as { id?: string })?.id,
            label: typeof m === 'string' ? m : (m as { label?: string })?.label || m,
            value: null,
            note: 'No live aggregate wired for this metric yet',
          })),
          series: [],
          empty: true,
        },
      });
    }

    const { data, error } = await db
      .from('report_definitions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ reports: data || [] });
  } catch {
    return serverErrorResponse();
  }
}

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

    const name = sanitizeString(String(body.name || '')).slice(0, 200);
    if (!name) return badRequestResponse('name required');
    const config =
      body.config && typeof body.config === 'object'
        ? (body.config as Record<string, unknown>)
        : {};

    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('report_definitions')
      .insert({
        name,
        config,
        created_by: auth.user.id,
      })
      .select()
      .single();
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data }, 201);
  } catch {
    return serverErrorResponse();
  }
}
