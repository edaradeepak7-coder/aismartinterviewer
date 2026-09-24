import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/certificates — certificates for the authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data, error } = await supabase
      .from('certificates')
      .select('id, title, issued_at, credential_code, meta')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (error) return secureJson({ error: error.message }, 500);

    const certificates = (data || []).map((c) => ({
      id: c.id,
      title: c.title,
      issuedAt: c.issued_at,
      credentialCode: c.credential_code,
      meta: c.meta || {},
    }));

    return secureJson({ certificates });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
