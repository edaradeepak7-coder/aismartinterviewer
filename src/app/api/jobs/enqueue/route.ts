/**
 * POST /api/jobs/enqueue
 * Enqueues a background job and returns the job record immediately.
 * The actual work is done asynchronously via /api/jobs/process.
 *
 * GET /api/jobs/enqueue
 * Lists jobs for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unauthorizedResponse, badRequestResponse, secureJson } from '@/lib/security/apiHelpers';
import { consumeToken, TOKEN_BUCKET_CONFIGS, rateLimitedResponse, getUserKey } from '@/lib/security/tokenBucket';
import {
  enqueueJob,
  listJobsForUser,
  listAllJobs,
  JobType,
} from '@/lib/services/backgroundJobService';

const ALLOWED_JOB_TYPES: JobType[] = [
  'ai_evaluation',
  'bulk_export',
  'report_generation',
  'renewal_reminder',
  'overage_check',
  'payment_retry',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = getUserKey(user.id, ip, 'jobs-enqueue');
    const rl = consumeToken(key, TOKEN_BUCKET_CONFIGS.DEFAULT);
    if (!rl.allowed) return rateLimitedResponse(rl, 'jobs-enqueue');

    const body = await request.json();
    const { type, payload, priority, max_retries, scheduled_at } = body;

    if (!type || !ALLOWED_JOB_TYPES.includes(type)) {
      return badRequestResponse(`Invalid job type. Allowed: ${ALLOWED_JOB_TYPES.join(', ')}`);
    }

    if (!payload || typeof payload !== 'object') {
      return badRequestResponse('payload must be a JSON object');
    }

    // Get tenant_id from user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    const job = await enqueueJob(user.id, {
      type,
      payload,
      priority: typeof priority === 'number' ? priority : 5,
      maxRetries: typeof max_retries === 'number' ? max_retries : 3,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : undefined,
      tenantId: profile?.tenant_id ?? undefined,
    });

    // Fire-and-forget: trigger the processor without waiting
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/jobs/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-job': 'true' },
      body: JSON.stringify({ job_id: job.id }),
    }).catch(() => {
      // Non-blocking — processor will pick it up on next poll
    });

    return secureJson({ data: job }, 201);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as JobType | null;
    const status = searchParams.get('status') as any;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

    const jobs = isAdmin
      ? await listAllJobs({ type: type ?? undefined, status: status ?? undefined, limit })
      : await listJobsForUser(user.id, { type: type ?? undefined, status: status ?? undefined, limit });

    return secureJson({ data: jobs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
