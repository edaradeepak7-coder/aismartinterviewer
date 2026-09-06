/**
 * Background Job Processor
 * Executes individual job types. Called by the /api/jobs/process route.
 * Each processor is isolated — a failure in one does not affect others.
 */

import { createClient } from '@/lib/supabase/server';
import { BackgroundJob } from './backgroundJobService';

export interface ProcessorResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

// ─── AI Evaluation Processor ──────────────────────────────────────────────────
export async function processAIEvaluation(job: BackgroundJob): Promise<ProcessorResult> {
  const { interview_id } = job.payload;
  if (!interview_id) return { success: false, error: 'Missing interview_id in payload' };

  try {
    // Call the existing evaluate API route internally
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/ai/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-job': 'true' },
      body: JSON.stringify({ interview_id }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Evaluate API failed' }));
      return { success: false, error: err.error || `HTTP ${res.status}` };
    }

    const result = await res.json();
    return { success: true, data: { interview_id, score: result?.evaluation?.overall_score } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Bulk Export Processor ────────────────────────────────────────────────────
export async function processBulkExport(job: BackgroundJob): Promise<ProcessorResult> {
  const { export_type, format, filters } = job.payload;
  if (!export_type) return { success: false, error: 'Missing export_type in payload' };

  try {
    const supabase = await createClient();
    const params = new URLSearchParams({ type: export_type, format: format || 'csv', ...filters });
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/bulk-export?${params.toString()}`, {
      headers: { 'x-internal-job': 'true' },
    });

    if (!res.ok) {
      return { success: false, error: `Bulk export API returned ${res.status}` };
    }

    // Store export result reference in Supabase storage or return metadata
    const contentType = res.headers.get('content-type') || '';
    const isCSV = contentType.includes('text/csv');
    const content = isCSV ? await res.text() : await res.text();

    // Upload to Supabase storage for async download
    const filename = `exports/${job.id}_${export_type}_${new Date().toISOString().split('T')[0]}.${format || 'csv'}`;
    const { error: uploadError } = await supabase.storage
      .from('job-exports')
      .upload(filename, content, {
        contentType: isCSV ? 'text/csv' : 'text/html',
        upsert: true,
      });

    if (uploadError) {
      // Storage bucket may not exist — return inline result reference
      return { success: true, data: { export_type, format, rows: content.split('\n').length - 1, note: 'Storage upload skipped' } };
    }

    const { data: signedUrl } = await supabase.storage
      .from('job-exports')
      .createSignedUrl(filename, 3600); // 1 hour expiry

    return {
      success: true,
      data: { export_type, format, filename, download_url: signedUrl?.signedUrl || null },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Report Generation Processor ─────────────────────────────────────────────
export async function processReportGeneration(job: BackgroundJob): Promise<ProcessorResult> {
  const { report_type, tenant_id, date_from, date_to } = job.payload;

  try {
    const supabase = await createClient();

    // Fetch aggregated data for the report
    const [interviewsRes, assessmentsRes, candidatesRes] = await Promise.all([
      supabase
        .from('interviews')
        .select('status, overall_score, recommendation, created_at')
        .gte('created_at', date_from || new Date(Date.now() - 30 * 86400000).toISOString())
        .lte('created_at', date_to || new Date().toISOString()),
      supabase
        .from('assessments')
        .select('status, score, created_at')
        .gte('created_at', date_from || new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase
        .from('candidates')
        .select('status, created_at')
        .gte('created_at', date_from || new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);

    const interviews = interviewsRes.data || [];
    const assessments = assessmentsRes.data || [];
    const candidates = candidatesRes.data || [];

    const avgScore = interviews.length
      ? Math.round(interviews.reduce((s, i) => s + (i.overall_score || 0), 0) / interviews.length)
      : 0;

    const report = {
      generated_at: new Date().toISOString(),
      report_type: report_type || 'platform_summary',
      period: { from: date_from, to: date_to },
      summary: {
        total_interviews: interviews.length,
        completed_interviews: interviews.filter(i => i.status === 'completed').length,
        avg_score: avgScore,
        total_assessments: assessments.length,
        new_candidates: candidates.length,
      },
    };

    return { success: true, data: report };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Renewal Reminder Processor ───────────────────────────────────────────────
export async function processRenewalReminder(job: BackgroundJob): Promise<ProcessorResult> {
  const { subscription_id, days_until_renewal } = job.payload;
  if (!subscription_id) return { success: false, error: 'Missing subscription_id' };

  try {
    const supabase = await createClient();

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*, user_profiles(id, email, full_name)')
      .eq('id', subscription_id)
      .maybeSingle();

    if (!sub) return { success: false, error: 'Subscription not found' };

    // Log reminder sent
    await supabase.from('subscription_email_alerts').insert({
      user_id: (sub as any).user_profiles?.id,
      alert_type: 'renewal_reminder',
      metadata: { subscription_id, days_until_renewal, plan: (sub as any).plan_id },
    });

    return {
      success: true,
      data: {
        subscription_id,
        days_until_renewal,
        user_email: (sub as any).user_profiles?.email,
        reminder_logged: true,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Overage Check Processor ──────────────────────────────────────────────────
export async function processOverageCheck(job: BackgroundJob): Promise<ProcessorResult> {
  const { tenant_id } = job.payload;
  if (!tenant_id) return { success: false, error: 'Missing tenant_id' };

  try {
    const supabase = await createClient();

    // Get current credit balance
    const { data: balance } = await supabase
      .from('credit_balances')
      .select('balance, reserved')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    const available = (balance?.balance || 0) - (balance?.reserved || 0);
    const isOverage = available < 0;

    if (isOverage) {
      // Log overage event
      await supabase.from('subscription_email_alerts').insert({
        user_id: null,
        alert_type: 'overage_detected',
        metadata: { tenant_id, available_credits: available, balance: balance?.balance },
      });
    }

    return {
      success: true,
      data: {
        tenant_id,
        available_credits: available,
        overage_detected: isOverage,
        checked_at: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Payment Retry Processor ──────────────────────────────────────────────────
export async function processPaymentRetry(job: BackgroundJob): Promise<ProcessorResult> {
  const { subscription_id, original_order_id, attempt } = job.payload;
  if (!subscription_id) return { success: false, error: 'Missing subscription_id' };

  try {
    const supabase = await createClient();

    // Fetch existing retry log
    const { data: retryLog } = await supabase
      .from('payment_retry_log')
      .select('*')
      .eq('subscription_id', subscription_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const retryAttempt = attempt || (retryLog?.retry_attempt || 0) + 1;
    const MAX_PAYMENT_RETRIES = 5;

    if (retryAttempt > MAX_PAYMENT_RETRIES) {
      // Mark subscription as payment_failed
      await supabase
        .from('subscriptions')
        .update({ status: 'payment_failed', updated_at: new Date().toISOString() })
        .eq('id', subscription_id);

      return {
        success: false,
        error: `Max payment retries (${MAX_PAYMENT_RETRIES}) exceeded for subscription ${subscription_id}`,
      };
    }

    // Calculate next retry time with exponential backoff (1h, 2h, 4h, 8h, 16h)
    const nextRetryHours = Math.pow(2, retryAttempt - 1);
    const nextRetryAt = new Date(Date.now() + nextRetryHours * 3600_000).toISOString();

    // Upsert retry log
    await supabase.from('payment_retry_log').upsert({
      subscription_id,
      original_order_id: original_order_id || null,
      retry_attempt: retryAttempt,
      next_retry_at: nextRetryAt,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'subscription_id' });

    return {
      success: true,
      data: {
        subscription_id,
        retry_attempt: retryAttempt,
        next_retry_at: nextRetryAt,
        next_retry_in_hours: nextRetryHours,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export async function dispatchJob(job: BackgroundJob): Promise<ProcessorResult> {
  switch (job.type) {
    case 'ai_evaluation':     return processAIEvaluation(job);
    case 'bulk_export':       return processBulkExport(job);
    case 'report_generation': return processReportGeneration(job);
    case 'renewal_reminder':  return processRenewalReminder(job);
    case 'overage_check':     return processOverageCheck(job);
    case 'payment_retry':     return processPaymentRetry(job);
    default:
      return { success: false, error: `Unknown job type: ${(job as any).type}` };
  }
}
