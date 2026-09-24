import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';
import {
  consumeToken,
  TOKEN_BUCKET_CONFIGS,
  rateLimitedResponse,
  getUserKey,
} from '@/lib/security/tokenBucket';

const STAFF_ROLES = new Set(['recruiter', 'org_admin', 'admin', 'super_admin', 'institution_admin']);
const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const BILLING_ROLES = new Set(['org_admin', 'admin', 'super_admin', 'institution_admin']);

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) {
    return 'message\nNo records found for the selected filters';
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
}

function buildPDFHtml(title: string, headers: string[], rows: string[][]): string {
  const headerCells = headers.map((h) => `<th>${h}</th>`).join('');
  const bodyRows = rows
    .map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`)
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#1a1a2e}
  h1{font-size:16px;margin-bottom:4px;color:#0f172a}
  p.meta{font-size:10px;color:#64748b;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  th{background:#0f172a;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
  td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10px}
  tr:nth-child(even) td{background:#f8fafc}
</style></head><body>
<h1>${title}</h1>
<p class="meta">Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC | Records: ${rows.length}</p>
<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;
}

async function scopedCandidateIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recruiterId: string,
): Promise<string[]> {
  const ids = new Set<string>();

  const { data: fromInterviews } = await supabase
    .from('interviews')
    .select('candidate_id')
    .eq('recruiter_id', recruiterId)
    .not('candidate_id', 'is', null)
    .limit(5000);

  (fromInterviews || []).forEach((r) => {
    if (r.candidate_id) ids.add(r.candidate_id);
  });

  const { data: fromMeta } = await supabase
    .from('recruiter_candidate_meta')
    .select('candidate_id')
    .eq('recruiter_id', recruiterId)
    .limit(5000);

  (fromMeta || []).forEach((r) => {
    if (r.candidate_id) ids.add(r.candidate_id);
  });

  return Array.from(ids);
}

function fileResponse(
  body: string,
  filename: string,
  contentType: string,
  disposition: 'attachment' | 'inline',
  count: number,
) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache',
      'X-Export-Count': String(count),
    },
  });
}

/**
 * GET /api/bulk-export?type=&format=&from=&to=
 * Role-gated; non-admins scoped to their interviews/candidates.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role || '';
    if (!STAFF_ROLES.has(role)) return forbiddenResponse();

    const isAdmin = ADMIN_ROLES.has(role);
    const canBilling = BILLING_ROLES.has(role);

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = getUserKey(user.id, ip, 'bulk-export');
    const rl = consumeToken(key, TOKEN_BUCKET_CONFIGS.BULK_EXPORT);
    if (!rl.allowed) return rateLimitedResponse(rl, 'bulk-export');

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const format = searchParams.get('format') || 'csv';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const ALLOWED_TYPES = ['candidates', 'transcripts', 'performance', 'billing'] as const;
    const ALLOWED_FORMATS = ['csv', 'pdf'] as const;

    if (!type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      return badRequestResponse('Invalid type. Use: candidates, transcripts, performance, billing');
    }
    if (!ALLOWED_FORMATS.includes(format as (typeof ALLOWED_FORMATS)[number])) {
      return badRequestResponse('Invalid format. Use: csv or pdf');
    }
    if (type === 'billing' && !canBilling) {
      return forbiddenResponse('Billing export requires org or platform admin');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    let csvRows: Record<string, unknown>[] = [];
    let pdfTitle = '';
    let filename = '';

    if (type === 'candidates') {
      pdfTitle = 'Candidate Records Export';
      filename = `candidate_records_${dateStr}`;

      if (!isAdmin) {
        const ids = await scopedCandidateIds(supabase, user.id);
        if (ids.length === 0) {
          csvRows = [];
        } else {
          let query = supabase
            .from('candidates')
            .select('id, name, email, role, department, experience_level, created_at')
            .in('id', ids.slice(0, 1000))
            .order('created_at', { ascending: false });
          if (from) query = query.gte('created_at', from);
          if (to) query = query.lte('created_at', `${to}T23:59:59`);
          const { data, error } = await query;
          if (error) return badRequestResponse('Failed to fetch candidates');
          csvRows = (data || []).map((c) => ({
            id: c.id,
            name: c.name || '',
            email: c.email || '',
            role: c.role || '',
            department: c.department || '',
            experience_level: c.experience_level || '',
            joined: c.created_at?.split('T')[0] || '',
          }));
        }
      } else {
        let query = supabase
          .from('candidates')
          .select('id, name, email, role, department, experience_level, created_at')
          .order('created_at', { ascending: false })
          .limit(5000);
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', `${to}T23:59:59`);
        const { data, error } = await query;
        if (error) return badRequestResponse('Failed to fetch candidates');
        csvRows = (data || []).map((c) => ({
          id: c.id,
          name: c.name || '',
          email: c.email || '',
          role: c.role || '',
          department: c.department || '',
          experience_level: c.experience_level || '',
          joined: c.created_at?.split('T')[0] || '',
        }));
      }
    } else if (type === 'transcripts' || type === 'performance') {
      const isPerf = type === 'performance';
      pdfTitle = isPerf ? 'Performance Reports Export' : 'Interview Transcripts Export';
      filename = isPerf ? `performance_reports_${dateStr}` : `interview_transcripts_${dateStr}`;

      let query = supabase
        .from('interviews')
        .select(
          isPerf
            ? 'id, role, company, department, interview_type, status, scheduled_at, completed_at, duration_minutes, overall_score, technical_score, communication_score, role_alignment_score, recommendation, candidates(name, email)'
            : 'id, role, company, interview_type, status, scheduled_at, completed_at, overall_score, recommendation, candidates(name, email)',
        )
        .order(isPerf ? 'completed_at' : 'scheduled_at', { ascending: false })
        .limit(5000);

      if (isPerf) query = query.not('overall_score', 'is', null);
      if (!isAdmin) query = query.eq('recruiter_id', user.id);
      if (isPerf) {
        if (from) query = query.gte('completed_at', from);
        if (to) query = query.lte('completed_at', `${to}T23:59:59`);
      } else {
        if (from) query = query.gte('scheduled_at', from);
        if (to) query = query.lte('scheduled_at', `${to}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) {
        return badRequestResponse(
          isPerf ? 'Failed to fetch performance reports' : 'Failed to fetch interview transcripts',
        );
      }

      csvRows = (data || []).map((i: Record<string, unknown>) => {
        const cand = i.candidates as { name?: string; email?: string } | null;
        if (isPerf) {
          return {
            interview_id: i.id,
            candidate_name: cand?.name || '',
            candidate_email: cand?.email || '',
            role: i.role || '',
            company: i.company || '',
            department: i.department || '',
            interview_type: i.interview_type || '',
            completed_date: String(i.completed_at || '').split('T')[0] || '',
            duration_minutes: i.duration_minutes ?? '',
            overall_score: i.overall_score ?? '',
            technical_score: i.technical_score ?? '',
            communication_score: i.communication_score ?? '',
            role_alignment_score: i.role_alignment_score ?? '',
            recommendation: i.recommendation || '',
          };
        }
        return {
          interview_id: i.id,
          candidate_name: cand?.name || '',
          candidate_email: cand?.email || '',
          role: i.role || '',
          company: i.company || '',
          interview_type: i.interview_type || '',
          status: i.status || '',
          scheduled_date: String(i.scheduled_at || '').split('T')[0] || '',
          completed_date: String(i.completed_at || '').split('T')[0] || '',
          overall_score: i.overall_score ?? '',
          recommendation: i.recommendation || '',
        };
      });
    } else if (type === 'billing') {
      pdfTitle = 'Billing History Export';
      filename = `billing_history_${dateStr}`;

      let query = supabase
        .from('seat_transactions')
        .select(
          'id, institution_id, seats_purchased, amount_paid, currency, payment_method, payment_reference, status, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(5000);

      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', `${to}T23:59:59`);

      // Institution admins: RLS already scopes; platform admins see all
      const { data, error } = await query;
      if (error) {
        csvRows = [];
      } else {
        csvRows = (data || []).map((t: Record<string, unknown>) => ({
          transaction_id: t.id,
          institution_id: t.institution_id || '',
          seats_purchased: t.seats_purchased ?? '',
          amount_paid: t.amount_paid ?? '',
          currency: t.currency || 'INR',
          payment_method: t.payment_method || '',
          payment_reference: t.payment_reference || '',
          status: t.status || '',
          date: String(t.created_at || '').split('T')[0] || '',
        }));
      }
    }

    if (format === 'csv') {
      return fileResponse(
        toCSV(csvRows),
        `${filename}.csv`,
        'text/csv; charset=utf-8',
        'attachment',
        csvRows.length,
      );
    }

    if (csvRows.length === 0) {
      return fileResponse(
        buildPDFHtml(pdfTitle, ['Message'], [['No records found for the selected filters']]),
        `${filename}.html`,
        'text/html; charset=utf-8',
        'inline',
        0,
      );
    }

    const headers = Object.keys(csvRows[0]).map((k) =>
      k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    );
    const bodyRows = csvRows.map((r) => Object.values(r).map((v) => String(v ?? '')));
    return fileResponse(
      buildPDFHtml(pdfTitle, headers, bodyRows),
      `${filename}.html`,
      'text/html; charset=utf-8',
      'inline',
      csvRows.length,
    );
  } catch (err) {
    console.error('bulk-export error:', err);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
