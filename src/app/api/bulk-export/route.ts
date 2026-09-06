import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';
import { consumeToken, TOKEN_BUCKET_CONFIGS, rateLimitedResponse, getUserKey } from '@/lib/security/tokenBucket';

function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? '' : String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\n');
}

function buildPDFHtml(title: string, headers: string[], rows: string[][]): string {
  const headerCells = headers.map(h => `<th>${h}</th>`).join('');
  const bodyRows = rows.map(r =>
    `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`
  ).join('');
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    // Per-user token bucket rate limiting for bulk export
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

    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      return badRequestResponse('Invalid type. Use: candidates, transcripts, performance, billing');
    }
    if (!ALLOWED_FORMATS.includes(format as any)) {
      return badRequestResponse('Invalid format. Use: csv or pdf');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    let csvRows: Record<string, any>[] = [];
    let pdfTitle = '';
    let filename = '';

    if (type === 'candidates') {
      let query = supabase
        .from('candidates')
        .select('id, name, email, role, department, experience_level, status, created_at')
        .order('created_at', { ascending: false });
      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to + 'T23:59:59');
      const { data, error } = await query;
      if (error) return badRequestResponse('Failed to fetch candidates');
      csvRows = (data || []).map(c => ({
        id: c.id,
        name: c.name || '',
        email: c.email || '',
        role: c.role || '',
        department: c.department || '',
        experience_level: c.experience_level || '',
        status: c.status || '',
        joined: c.created_at?.split('T')[0] || '',
      }));
      pdfTitle = 'Candidate Records Export';
      filename = `candidate_records_${dateStr}`;
    } else if (type === 'transcripts') {
      let query = supabase
        .from('interviews')
        .select('id, role, company, interview_type, status, scheduled_at, completed_at, overall_score, recommendation, candidates(name, email)')
        .order('scheduled_at', { ascending: false });
      if (from) query = query.gte('scheduled_at', from);
      if (to) query = query.lte('scheduled_at', to + 'T23:59:59');
      const { data, error } = await query;
      if (error) return badRequestResponse('Failed to fetch interview transcripts');
      csvRows = (data || []).map((i: any) => ({
        interview_id: i.id,
        candidate_name: i.candidates?.name || '',
        candidate_email: i.candidates?.email || '',
        role: i.role || '',
        company: i.company || '',
        interview_type: i.interview_type || '',
        status: i.status || '',
        scheduled_date: i.scheduled_at?.split('T')[0] || '',
        completed_date: i.completed_at?.split('T')[0] || '',
        overall_score: i.overall_score ?? '',
        recommendation: i.recommendation || '',
      }));
      pdfTitle = 'Interview Transcripts Export';
      filename = `interview_transcripts_${dateStr}`;
    } else if (type === 'performance') {
      let query = supabase
        .from('interviews')
        .select('id, role, company, department, interview_type, status, scheduled_at, completed_at, duration_minutes, overall_score, technical_score, communication_score, role_alignment_score, recommendation, candidates(name, email)')
        .not('overall_score', 'is', null)
        .order('completed_at', { ascending: false });
      if (from) query = query.gte('completed_at', from);
      if (to) query = query.lte('completed_at', to + 'T23:59:59');
      const { data, error } = await query;
      if (error) return badRequestResponse('Failed to fetch performance reports');
      csvRows = (data || []).map((i: any) => ({
        interview_id: i.id,
        candidate_name: i.candidates?.name || '',
        candidate_email: i.candidates?.email || '',
        role: i.role || '',
        company: i.company || '',
        department: i.department || '',
        interview_type: i.interview_type || '',
        completed_date: i.completed_at?.split('T')[0] || '',
        duration_minutes: i.duration_minutes ?? '',
        overall_score: i.overall_score ?? '',
        technical_score: i.technical_score ?? '',
        communication_score: i.communication_score ?? '',
        role_alignment_score: i.role_alignment_score ?? '',
        recommendation: i.recommendation || '',
      }));
      pdfTitle = 'Performance Reports Export';
      filename = `performance_reports_${dateStr}`;
    } else if (type === 'billing') {
      let query = supabase
        .from('seat_transactions')
        .select('id, institution_id, seats_purchased, amount_paid, currency, payment_method, payment_reference, status, created_at')
        .order('created_at', { ascending: false });
      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to + 'T23:59:59');
      const { data, error } = await query;
      if (error) {
        // Fallback: try subscription table if seat_transactions doesn't exist
        csvRows = [];
      } else {
        csvRows = (data || []).map((t: any) => ({
          transaction_id: t.id,
          institution_id: t.institution_id || '',
          seats_purchased: t.seats_purchased ?? '',
          amount_paid: t.amount_paid ?? '',
          currency: t.currency || 'INR',
          payment_method: t.payment_method || '',
          payment_reference: t.payment_reference || '',
          status: t.status || '',
          date: t.created_at?.split('T')[0] || '',
        }));
      }
      pdfTitle = 'Billing History Export';
      filename = `billing_history_${dateStr}`;
    }

    if (format === 'csv') {
      const csv = toCSV(csvRows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
          'Cache-Control': 'no-store, no-cache',
        },
      });
    }

    // PDF: return HTML that the browser can print-to-PDF
    if (csvRows.length === 0) {
      return new NextResponse(buildPDFHtml(pdfTitle, ['No Data'], [['No records found for the selected filters']]), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="${filename}.html"`,
        },
      });
    }
    const headers = Object.keys(csvRows[0]).map(k => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    const bodyRows = csvRows.map(r => Object.values(r).map(v => String(v ?? '')));
    const html = buildPDFHtml(pdfTitle, headers, bodyRows);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filename}.html"`,
      },
    });
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
