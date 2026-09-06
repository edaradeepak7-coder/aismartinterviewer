/**
 * Background Job Service
 * Enqueues and manages long-running tasks to avoid API route timeouts.
 * Supports: AI evaluations, bulk exports, report generation,
 *           renewal reminders, overage checks, payment retry logic.
 */

import { createClient } from '@/lib/supabase/server';

export type JobType =
  | 'ai_evaluation' |'bulk_export' |'report_generation' |'renewal_reminder' |'overage_check' |'payment_retry';

export type JobStatus =
  | 'pending' |'running' |'completed' |'failed' |'cancelled' |'retrying';

export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: Record<string, any>;
  result: Record<string, any> | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  priority: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  next_retry_at: string | null;
  created_by: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnqueueJobOptions {
  type: JobType;
  payload: Record<string, any>;
  priority?: number;       // 1 (highest) – 10 (lowest), default 5
  maxRetries?: number;     // default 3
  scheduledAt?: Date;      // default: now
  tenantId?: string;
}

// ─── Enqueue ─────────────────────────────────────────────────────────────────

/**
 * Enqueue a background job. Returns the created job record.
 * Call this from any API route instead of running the task inline.
 */
export async function enqueueJob(
  userId: string,
  opts: EnqueueJobOptions
): Promise<BackgroundJob> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('background_jobs')
    .insert({
      type: opts.type,
      payload: opts.payload,
      priority: opts.priority ?? 5,
      max_retries: opts.maxRetries ?? 3,
      scheduled_at: (opts.scheduledAt ?? new Date()).toISOString(),
      tenant_id: opts.tenantId ?? null,
      created_by: userId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to enqueue job: ${error.message}`);
  return data as BackgroundJob;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export async function getJob(jobId: string): Promise<BackgroundJob | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();
  return data as BackgroundJob | null;
}

export async function listJobsForUser(
  userId: string,
  opts?: { type?: JobType; status?: JobStatus; limit?: number }
): Promise<BackgroundJob[]> {
  const supabase = await createClient();
  let query = supabase
    .from('background_jobs')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50);

  if (opts?.type) query = query.eq('type', opts.type);
  if (opts?.status) query = query.eq('status', opts.status);

  const { data } = await query;
  return (data ?? []) as BackgroundJob[];
}

export async function listAllJobs(opts?: {
  type?: JobType;
  status?: JobStatus;
  limit?: number;
}): Promise<BackgroundJob[]> {
  const supabase = await createClient();
  let query = supabase
    .from('background_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.type) query = query.eq('type', opts.type);
  if (opts?.status) query = query.eq('status', opts.status);

  const { data } = await query;
  return (data ?? []) as BackgroundJob[];
}

export async function cancelJob(jobId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('background_jobs')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .in('status', ['pending', 'retrying']);
}

// ─── Internal processor helpers ───────────────────────────────────────────────

/**
 * Mark a job as running and log the attempt.
 * Returns the attempt number.
 */
export async function markJobRunning(jobId: string): Promise<number> {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from('background_jobs')
    .select('retry_count')
    .eq('id', jobId)
    .single();

  const attempt = (job?.retry_count ?? 0) + 1;

  await supabase
    .from('background_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  await supabase.from('job_execution_log').insert({
    job_id: jobId,
    attempt,
    status: 'running',
    started_at: new Date().toISOString(),
  });

  return attempt;
}

export async function markJobCompleted(
  jobId: string,
  result: Record<string, any>,
  attempt: number,
  durationMs: number
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase
    .from('background_jobs')
    .update({
      status: 'completed',
      result,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', jobId);

  await supabase
    .from('job_execution_log')
    .update({
      status: 'completed',
      finished_at: now,
      duration_ms: durationMs,
    })
    .eq('job_id', jobId)
    .eq('attempt', attempt);
}

export async function markJobFailed(
  jobId: string,
  errorMessage: string,
  attempt: number,
  durationMs: number,
  maxRetries: number
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const willRetry = attempt < maxRetries;
  const nextRetryAt = willRetry
    ? new Date(Date.now() + Math.pow(2, attempt) * 60_000).toISOString() // exponential backoff
    : null;

  await supabase
    .from('background_jobs')
    .update({
      status: willRetry ? 'retrying' : 'failed',
      error_message: errorMessage,
      retry_count: attempt,
      next_retry_at: nextRetryAt,
      updated_at: now,
    })
    .eq('id', jobId);

  await supabase
    .from('job_execution_log')
    .update({
      status: 'failed',
      finished_at: now,
      duration_ms: durationMs,
      error_message: errorMessage,
    })
    .eq('job_id', jobId)
    .eq('attempt', attempt);
}

// ─── Convenience enqueue helpers ─────────────────────────────────────────────

export async function enqueueAIEvaluation(
  userId: string,
  interviewId: string,
  tenantId?: string
): Promise<BackgroundJob> {
  return enqueueJob(userId, {
    type: 'ai_evaluation',
    payload: { interview_id: interviewId },
    priority: 2,
    maxRetries: 3,
    tenantId,
  });
}

export async function enqueueBulkExport(
  userId: string,
  exportType: string,
  format: string,
  filters: Record<string, string>,
  tenantId?: string
): Promise<BackgroundJob> {
  return enqueueJob(userId, {
    type: 'bulk_export',
    payload: { export_type: exportType, format, filters },
    priority: 4,
    maxRetries: 2,
    tenantId,
  });
}

export async function enqueueReportGeneration(
  userId: string,
  reportConfig: Record<string, any>,
  tenantId?: string
): Promise<BackgroundJob> {
  return enqueueJob(userId, {
    type: 'report_generation',
    payload: reportConfig,
    priority: 4,
    maxRetries: 2,
    tenantId,
  });
}

export async function enqueueRenewalReminder(
  userId: string,
  subscriptionId: string,
  daysUntilRenewal: number,
  tenantId?: string
): Promise<BackgroundJob> {
  return enqueueJob(userId, {
    type: 'renewal_reminder',
    payload: { subscription_id: subscriptionId, days_until_renewal: daysUntilRenewal },
    priority: 6,
    maxRetries: 3,
    tenantId,
  });
}

export async function enqueueOverageCheck(
  userId: string,
  tenantId: string
): Promise<BackgroundJob> {
  return enqueueJob(userId, {
    type: 'overage_check',
    payload: { tenant_id: tenantId },
    priority: 3,
    maxRetries: 3,
    tenantId,
  });
}

export async function enqueuePaymentRetry(
  userId: string,
  subscriptionId: string,
  originalOrderId: string,
  attempt: number,
  tenantId?: string
): Promise<BackgroundJob> {
  return enqueueJob(userId, {
    type: 'payment_retry',
    payload: {
      subscription_id: subscriptionId,
      original_order_id: originalOrderId,
      attempt,
    },
    priority: 1,
    maxRetries: 5,
    tenantId,
  });
}
