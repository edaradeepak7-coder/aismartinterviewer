import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, parseIntSafe, isValidEmail } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';
import { encryptFields, ENCRYPTED_FIELDS } from '@/lib/security/encryption';
import { writeAuditLogServer } from '@/lib/security/auditLog';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const search = searchParams.get('search');
    const limit = parseIntSafe(searchParams.get('limit'), 50, 1, 100);
    const offset = parseIntSafe(searchParams.get('offset'), 0, 0, 100_000);

    // Sanitize search to prevent injection patterns
    const safeSearch = search ? sanitizeString(search).slice(0, 100) : null;

    let query = supabase
      .from('candidates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq('user_id', userId);
    if (safeSearch) query = query.or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,role.ilike.%${safeSearch}%`);

    const { data, error, count } = await query;
    if (error) return secureJson({ error: 'Failed to fetch candidates' }, 500);

    return secureJson({ data, count, limit, offset });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const name = sanitizeString(body.name);
    const email = sanitizeString(body.email);
    const role = sanitizeString(body.role);
    const department = sanitizeString(body.department);
    const experience_level = sanitizeString(body.experience_level);
    const avatar_initials = sanitizeString(body.avatar_initials).slice(0, 3);

    if (!name || !email) {
      return badRequestResponse('name and email are required');
    }
    if (!isValidEmail(email)) {
      return badRequestResponse('Invalid email address');
    }
    if (name.length > 200) return badRequestResponse('name is too long');

    // Encrypt PII fields before storage
    const plainPayload = { name, email, role: role || '', department: department || null, experience_level: experience_level || null, avatar_initials: avatar_initials || null, user_id: user.id };
    const encryptedPayload = await encryptFields(plainPayload as any, ENCRYPTED_FIELDS.candidate as any);

    const { data, error } = await supabase
      .from('candidates')
      .upsert(
        { ...encryptedPayload, pii_encrypted: true },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to create candidate' }, 500);

    // Audit log
    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: user.email,
        action: 'data_created',
        resource: 'candidate',
        resource_id: data?.id,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        user_agent: request.headers.get('user-agent') ?? 'unknown',
        outcome: 'success',
        details: { encrypted: true },
      },
      supabase
    );

    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
