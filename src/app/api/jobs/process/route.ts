/**
 * POST /api/jobs/process
 * Processes a single background job by ID.
 * Called fire-and-forget from /api/jobs/enqueue, or polled by the job runner.
 *
 * POST /api/jobs/process/poll
 * Picks up the next pending job and processes it (for cron/polling scenarios).
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  getJob,
  markJobRunning,
  markJobCompleted,
  markJobFailed,
} from '@/lib/services/backgroundJobService';
import { dispatchJob } from '@/lib/services/jobProcessors';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const { job_id } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
    }

    const job = await getJob(job_id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Only process pending or retrying jobs
    if (!['pending', 'retrying'].includes(job.status)) {
      return NextResponse.json({
        message: `Job ${job_id} is in status "${job.status}" — skipping`,
        status: job.status,
      });
    }

    // Check if scheduled_at is in the future
    if (new Date(job.scheduled_at) > new Date()) {
      return NextResponse.json({
        message: 'Job is scheduled for the future — skipping',
        scheduled_at: job.scheduled_at,
      });
    }

    // Mark as running
    const attempt = await markJobRunning(job_id);

    // Execute the job
    const result = await dispatchJob(job);
    const durationMs = Date.now() - startTime;

    if (result.success) {
      await markJobCompleted(job_id, result.data || {}, attempt, durationMs);
      return NextResponse.json({
        success: true,
        job_id,
        type: job.type,
        duration_ms: durationMs,
        result: result.data,
      });
    } else {
      await markJobFailed(job_id, result.error || 'Unknown error', attempt, durationMs, job.max_retries);
      return NextResponse.json({
        success: false,
        job_id,
        type: job.type,
        duration_ms: durationMs,
        error: result.error,
        will_retry: attempt < job.max_retries,
      }, { status: 422 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
