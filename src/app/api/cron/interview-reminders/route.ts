import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { secureJson } from '@/lib/security/apiHelpers';
import {
  assertCronAuth,
  processDueInterviewReminders,
} from '@/lib/interviews/sendReminders';

/**
 * POST /api/cron/interview-reminders
 *
 * Batch-send ~24h reminders for scheduled interviews.
 * Auth: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 *
 * Schedule example (every 30 min):
 *   curl -X POST https://your-app/api/cron/interview-reminders \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  if (!assertCronAuth(request)) {
    return secureJson({ error: 'Forbidden — set CRON_SECRET and pass Bearer / x-cron-secret' }, 403);
  }

  try {
    const supabase = createServiceRoleClient();
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100);

    const summary = await processDueInterviewReminders(supabase, { limit });

    if (summary.error) {
      return secureJson({ error: summary.error, missingColumn: summary.missingColumn }, 500);
    }

    return secureJson({
      ok: true,
      processed: summary.processed,
      sent: summary.sent,
      skipped: summary.skipped,
      failed: summary.failed,
      missingColumn: summary.missingColumn,
      results: summary.results,
      hint: summary.missingColumn
        ? 'Apply migration 20260923140000_interview_reminder_sent.sql for idempotent reminder_sent_at'
        : undefined,
    });
  } catch (err) {
    console.error('cron interview-reminders error:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

/** GET for uptime monitors — requires same auth */
export async function GET(request: NextRequest) {
  if (!assertCronAuth(request)) {
    return secureJson({ error: 'Forbidden' }, 403);
  }
  return secureJson({
    ok: true,
    endpoint: '/api/cron/interview-reminders',
    method: 'POST',
    window: '22h–26h before scheduled_at',
    requires: 'CRON_SECRET (+ SUPABASE_SERVICE_ROLE_KEY recommended)',
  });
}
