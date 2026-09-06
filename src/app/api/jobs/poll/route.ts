/**
 * POST /api/jobs/poll
 * Picks up the next N pending/retrying jobs and processes them.
 * Designed to be called by a Supabase cron job or external scheduler.
 * Protected by an internal secret header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  markJobRunning,
  markJobCompleted,
  markJobFailed,
} from '@/lib/services/backgroundJobService';
import { dispatchJob } from '@/lib/services/jobProcessors';
import { BackgroundJob } from '@/lib/services/backgroundJobService';

const BATCH_SIZE = 5; // Process up to 5 jobs per poll

export async function POST(request: NextRequest) {
  // Simple internal auth — callers must pass x-internal-job header
  const internalHeader = request.headers.get('x-internal-job');
  if (internalHeader !== 'true') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = await createClient();

    // Fetch next batch of pending/retrying jobs ordered by priority then scheduled_at
    const { data: jobs, error } = await supabase
      .from('background_jobs')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs', processed: 0 });
    }

    const results = await Promise.allSettled(
      (jobs as BackgroundJob[]).map(async (job) => {
        const startTime = Date.now();
        const attempt = await markJobRunning(job.id);
        const result = await dispatchJob(job);
        const durationMs = Date.now() - startTime;

        if (result.success) {
          await markJobCompleted(job.id, result.data || {}, attempt, durationMs);
          return { job_id: job.id, type: job.type, success: true, duration_ms: durationMs };
        } else {
          await markJobFailed(job.id, result.error || 'Unknown error', attempt, durationMs, job.max_retries);
          return { job_id: job.id, type: job.type, success: false, error: result.error };
        }
      })
    );

    const summary = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { job_id: (jobs[i] as BackgroundJob).id, success: false, error: 'Processor threw' }
    );

    return NextResponse.json({
      processed: jobs.length,
      results: summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
