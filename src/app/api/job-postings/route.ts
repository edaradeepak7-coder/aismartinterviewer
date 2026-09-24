import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

// Admin: GET all job postings, POST create
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('job_postings')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) return secureJson({ error: 'Failed to fetch job postings' }, 500);

    return secureJson({ data: data || [] });
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

    const title = sanitizeString(body.title);
    const department = sanitizeString(body.department);
    const location = sanitizeString(body.location);
    const employment_type = sanitizeString(body.employment_type);
    const description = sanitizeString(body.description);
    const requirements = sanitizeString(body.requirements);
    const salary_min = typeof body.salary_min === 'number' ? Math.max(0, body.salary_min) : null;
    const salary_max = typeof body.salary_max === 'number' ? Math.max(0, body.salary_max) : null;

    if (!title) return badRequestResponse('title is required');
    if (title.length > 200) return badRequestResponse('title is too long');

    const ALLOWED_EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship'] as const;
    if (employment_type && !ALLOWED_EMPLOYMENT_TYPES.includes(employment_type as any)) {
      return badRequestResponse('Invalid employment_type');
    }

    const { data, error } = await supabase
      .from('job_postings')
      .insert({
        title,
        department: department || null,
        location: location || null,
        employment_type: employment_type || 'full_time',
        description: description || null,
        requirements: requirements || null,
        salary_min,
        salary_max,
        is_active: true,
        applications_count: 0,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to create job posting' }, 500);
    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
