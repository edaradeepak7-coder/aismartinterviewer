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

const STAGES = new Set(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const db = createServiceRoleClient();
    const stage = request.nextUrl.searchParams.get('stage');
    const q = sanitizeString(request.nextUrl.searchParams.get('q') || '').slice(0, 100);

    let query = db
      .from('crm_leads')
      .select('*, crm_tasks(*)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (stage && stage !== 'all') {
      if (!STAGES.has(stage)) return badRequestResponse('Invalid stage');
      query = query.eq('stage', stage);
    }

    const { data, error } = await query;
    if (error) return secureJson({ error: error.message }, 500);

    let leads = data || [];
    if (q) {
      const lower = q.toLowerCase();
      leads = leads.filter(
        (l) =>
          String(l.name || '').toLowerCase().includes(lower) ||
          String(l.email || '').toLowerCase().includes(lower) ||
          String(l.company || '').toLowerCase().includes(lower),
      );
    }

    const tasksRes = await db
      .from('crm_tasks')
      .select('*')
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(100);

    return secureJson({
      leads,
      tasks: tasksRes.data || [],
      kpis: {
        total: leads.length,
        pipelineValue: leads.reduce((s, l) => s + Number(l.value || 0), 0),
        won: leads.filter((l) => l.stage === 'won').length,
      },
    });
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

    const resource = String(body.resource || 'lead');
    const db = createServiceRoleClient();

    if (resource === 'task') {
      const title = sanitizeString(String(body.title || '')).slice(0, 200);
      if (!title) return badRequestResponse('title required');
      const leadId = body.lead_id ? String(body.lead_id) : null;
      if (leadId && !isValidUUID(leadId)) return badRequestResponse('Invalid lead_id');

      const { data, error } = await db
        .from('crm_tasks')
        .insert({
          title,
          lead_id: leadId,
          due_at: body.due_at ? String(body.due_at) : null,
          done: Boolean(body.done),
        })
        .select()
        .single();
      if (error) return secureJson({ error: error.message }, 500);
      return secureJson({ data }, 201);
    }

    const name = sanitizeString(String(body.name || '')).slice(0, 120);
    if (!name) return badRequestResponse('name required');
    const stage = String(body.stage || 'new');
    if (!STAGES.has(stage)) return badRequestResponse('Invalid stage');

    const { data, error } = await db
      .from('crm_leads')
      .insert({
        name,
        email: sanitizeString(String(body.email || '')).slice(0, 200),
        company: sanitizeString(String(body.company || '')).slice(0, 200),
        stage,
        value: Number(body.value ?? 0) || 0,
        owner_id: auth.user.id,
      })
      .select()
      .single();
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data }, 201);
  } catch {
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const id = String(body.id || '');
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');
    const resource = String(body.resource || 'lead');
    const db = createServiceRoleClient();

    if (resource === 'task') {
      const updates: Record<string, unknown> = {};
      if (typeof body.title === 'string') updates.title = sanitizeString(body.title).slice(0, 200);
      if (typeof body.done === 'boolean') updates.done = body.done;
      if (body.due_at !== undefined) updates.due_at = body.due_at ? String(body.due_at) : null;
      if (Object.keys(updates).length === 0) return badRequestResponse('No updates');

      const { data, error } = await db.from('crm_tasks').update(updates).eq('id', id).select().single();
      if (error) return secureJson({ error: error.message }, 500);
      if (!data) return notFoundResponse('Task not found');
      return secureJson({ data });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') updates.name = sanitizeString(body.name).slice(0, 120);
    if (typeof body.email === 'string') updates.email = sanitizeString(body.email).slice(0, 200);
    if (typeof body.company === 'string') updates.company = sanitizeString(body.company).slice(0, 200);
    if (typeof body.stage === 'string') {
      if (!STAGES.has(body.stage)) return badRequestResponse('Invalid stage');
      updates.stage = body.stage;
    }
    if (body.value !== undefined) updates.value = Number(body.value) || 0;
    if (Object.keys(updates).length === 0) return badRequestResponse('No updates');

    const { data, error } = await db.from('crm_leads').update(updates).eq('id', id).select().single();
    if (error) return secureJson({ error: error.message }, 500);
    if (!data) return notFoundResponse('Lead not found');
    return secureJson({ data });
  } catch {
    return serverErrorResponse();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const id = request.nextUrl.searchParams.get('id') || '';
    const resource = request.nextUrl.searchParams.get('resource') || 'lead';
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');

    const db = createServiceRoleClient();
    const table = resource === 'task' ? 'crm_tasks' : 'crm_leads';
    const { error } = await db.from(table).delete().eq('id', id);
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ ok: true });
  } catch {
    return serverErrorResponse();
  }
}
