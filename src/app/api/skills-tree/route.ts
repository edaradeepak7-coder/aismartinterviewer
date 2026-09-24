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

type FlatNode = {
  id: string;
  parent_id: string | null;
  name: string;
  description: string;
  sort_order: number;
};

function buildTree(rows: FlatNode[]) {
  const byParent = new Map<string | null, FlatNode[]>();
  for (const r of rows) {
    const key = r.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(r);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }
  function nest(parentId: string | null, level: number): Array<FlatNode & { level: number; children: ReturnType<typeof nest> }> {
    return (byParent.get(parentId) || []).map((n) => ({
      ...n,
      level,
      children: nest(n.id, level + 1),
    }));
  }
  return nest(null, 0);
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('skills_nodes')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return secureJson({ error: error.message }, 500);

    const rows = (data || []) as FlatNode[];
    return secureJson({
      nodes: rows,
      tree: buildTree(rows),
      total: rows.length,
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

    const name = sanitizeString(String(body.name || '')).slice(0, 120);
    if (!name) return badRequestResponse('name required');
    const parentId = body.parent_id ? String(body.parent_id) : null;
    if (parentId && !isValidUUID(parentId)) return badRequestResponse('Invalid parent_id');

    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('skills_nodes')
      .insert({
        name,
        description: sanitizeString(String(body.description || '')).slice(0, 2000),
        parent_id: parentId,
        sort_order: Number(body.sort_order ?? 0) || 0,
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

    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') updates.name = sanitizeString(body.name).slice(0, 120);
    if (typeof body.description === 'string')
      updates.description = sanitizeString(body.description).slice(0, 2000);
    if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order) || 0;
    if (body.parent_id !== undefined) {
      if (body.parent_id === null || body.parent_id === '') updates.parent_id = null;
      else {
        if (!isValidUUID(String(body.parent_id))) return badRequestResponse('Invalid parent_id');
        if (String(body.parent_id) === id) return badRequestResponse('Cannot parent to self');
        updates.parent_id = String(body.parent_id);
      }
    }
    if (Object.keys(updates).length === 0) return badRequestResponse('No updates');

    const db = createServiceRoleClient();
    const { data, error } = await db.from('skills_nodes').update(updates).eq('id', id).select().single();
    if (error) return secureJson({ error: error.message }, 500);
    if (!data) return notFoundResponse('Skill not found');
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
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');

    const db = createServiceRoleClient();
    const { error } = await db.from('skills_nodes').delete().eq('id', id);
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ ok: true });
  } catch {
    return serverErrorResponse();
  }
}
