/**
 * GET  /api/jobs/[id]  — Get job details + execution log
 * DELETE /api/jobs/[id] — Cancel a pending job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unauthorizedResponse, secureJson } from '@/lib/security/apiHelpers';
import { getJob, cancelJob } from '@/lib/services/backgroundJobService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const job = await getJob(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Fetch execution log
    const { data: execLog } = await supabase
      .from('job_execution_log')
      .select('*')
      .eq('job_id', id)
      .order('attempt', { ascending: true });

    return secureJson({ data: { ...job, execution_log: execLog || [] } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    await cancelJob(id);
    return secureJson({ message: 'Job cancelled' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
