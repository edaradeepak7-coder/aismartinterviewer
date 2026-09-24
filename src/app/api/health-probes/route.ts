import { NextRequest } from 'next/server';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

type ProbeStatus = 'ok' | 'warn' | 'fail' | 'skip';

interface ProbeResult {
  probe_key: string;
  status: ProbeStatus;
  latency_ms: number | null;
  detail: Record<string, unknown>;
}

function envFlag(key: string): { set: boolean; placeholder: boolean } {
  const v = process.env[key];
  if (!v || !v.trim()) return { set: false, placeholder: false };
  const lower = v.toLowerCase();
  const placeholder =
    lower.includes('your-') ||
    lower.includes('placeholder') ||
    lower === 'xxx' ||
    lower.startsWith('sk-xxx');
  return { set: true, placeholder };
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - start };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const persist = request.nextUrl.searchParams.get('persist') === '1';
    const probes: ProbeResult[] = [];

    // Supabase auth session
    try {
      const { result, ms } = await timed(async () => {
        const supabase = await createClient();
        return supabase.auth.getSession();
      });
      const hasSession = Boolean(result.data.session);
      probes.push({
        probe_key: 'supabase_auth_session',
        status: hasSession ? 'ok' : 'warn',
        latency_ms: ms,
        detail: {
          hasSession,
          userId: result.data.session?.user?.id || null,
          message: hasSession ? 'Auth session present' : 'No active session cookie',
        },
      });
    } catch (e) {
      probes.push({
        probe_key: 'supabase_auth_session',
        status: 'fail',
        latency_ms: null,
        detail: { message: e instanceof Error ? e.message : 'Auth check failed' },
      });
    }

    // Supabase DB round-trip
    try {
      const { result, ms } = await timed(async () => {
        const db = createServiceRoleClient();
        return db.from('user_profiles').select('id', { count: 'exact', head: true });
      });
      probes.push({
        probe_key: 'supabase_db',
        status: result.error ? 'fail' : 'ok',
        latency_ms: ms,
        detail: {
          message: result.error ? result.error.message : 'DB reachable',
          count: result.count,
        },
      });
    } catch (e) {
      probes.push({
        probe_key: 'supabase_db',
        status: 'fail',
        latency_ms: null,
        detail: { message: e instanceof Error ? e.message : 'DB check failed' },
      });
    }

    // Env flags (presence only — no fake latencies)
    const envChecks: { key: string; probe: string; critical: boolean }[] = [
      { key: 'NEXT_PUBLIC_SUPABASE_URL', probe: 'env_supabase_url', critical: true },
      { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', probe: 'env_supabase_anon', critical: true },
      { key: 'OPENAI_API_KEY', probe: 'env_openai', critical: false },
      { key: 'GROQ_API_KEY', probe: 'env_groq', critical: false },
      { key: 'RESEND_API_KEY', probe: 'env_resend', critical: false },
      { key: 'FIELD_ENCRYPTION_KEY', probe: 'env_encryption', critical: false },
    ];

    for (const e of envChecks) {
      const flag = envFlag(e.key);
      let status: ProbeStatus = 'ok';
      if (!flag.set) status = e.critical ? 'fail' : 'warn';
      else if (flag.placeholder) status = 'warn';
      probes.push({
        probe_key: e.probe,
        status,
        latency_ms: null,
        detail: {
          env: e.key,
          set: flag.set,
          placeholder: flag.placeholder,
          message: !flag.set
            ? 'Not set'
            : flag.placeholder
              ? 'Placeholder value detected'
              : 'Set',
        },
      });
    }

    if (persist) {
      const db = createServiceRoleClient();
      await db.from('health_probe_results').insert(
        probes.map((p) => ({
          probe_key: p.probe_key,
          status: p.status,
          latency_ms: p.latency_ms,
          detail: p.detail,
        })),
      );
    }

    // Recent history (honest empty if none)
    const db = createServiceRoleClient();
    const { data: recent } = await db
      .from('health_probe_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const summary = {
      ok: probes.filter((p) => p.status === 'ok').length,
      warn: probes.filter((p) => p.status === 'warn').length,
      fail: probes.filter((p) => p.status === 'fail').length,
      skip: probes.filter((p) => p.status === 'skip').length,
    };

    return secureJson({
      probes,
      summary,
      recent: recent || [],
      checked_at: new Date().toISOString(),
    });
  } catch {
    return serverErrorResponse();
  }
}
