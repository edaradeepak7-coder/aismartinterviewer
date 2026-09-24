import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, parseIntSafe } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const technology = searchParams.get('technology');
    const limit = parseIntSafe(searchParams.get('limit'), 100, 1, 200);

    const ALLOWED_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
    if (difficulty && !ALLOWED_DIFFICULTIES.includes(difficulty as any)) {
      return badRequestResponse('Invalid difficulty value');
    }

    const safeCategory = category ? sanitizeString(category).slice(0, 100) : null;
    const safeTechnology = technology ? sanitizeString(technology).slice(0, 100) : null;

    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (activeOnly) query = query.eq('is_active', true);
    if (safeCategory) query = query.eq('category', safeCategory);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (safeTechnology) query = query.ilike('technology', `%${safeTechnology}%`);

    const { data, error } = await query;
    if (error) return secureJson({ error: 'Failed to fetch questions' }, 500);

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

    const text = sanitizeString(body.text);
    const category = sanitizeString(body.category);
    const difficulty = sanitizeString(body.difficulty);
    const technology = body.technology ? sanitizeString(body.technology) : null;

    if (!text) return badRequestResponse('text is required');
    if (text.length > 2000) return badRequestResponse('text is too long');

    const ALLOWED_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
    if (difficulty && !ALLOWED_DIFFICULTIES.includes(difficulty as any)) {
      return badRequestResponse('Invalid difficulty value');
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        text,
        category: category || 'Technical',
        difficulty: difficulty || 'Medium',
        technology,
        is_active: true,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to create question' }, 500);
    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
