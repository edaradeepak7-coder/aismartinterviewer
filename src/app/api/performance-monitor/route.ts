import { NextRequest } from 'next/server';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    let memory: {
      rssMb: number | null;
      heapUsedMb: number | null;
      heapTotalMb: number | null;
      externalMb: number | null;
    } = {
      rssMb: null,
      heapUsedMb: null,
      heapTotalMb: null,
      externalMb: null,
    };

    let uptimeSec: number | null = null;
    try {
      if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
        const m = process.memoryUsage();
        memory = {
          rssMb: Math.round(m.rss / 1024 / 1024),
          heapUsedMb: Math.round(m.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(m.heapTotal / 1024 / 1024),
          externalMb: Math.round(m.external / 1024 / 1024),
        };
      }
      if (typeof process !== 'undefined' && typeof process.uptime === 'function') {
        uptimeSec = Math.round(process.uptime());
      }
    } catch {
      // ignore — Node APIs unavailable
    }

    const db = createServiceRoleClient();
    const { data: probes } = await db
      .from('health_probe_results')
      .select('probe_key, status, latency_ms, created_at')
      .not('latency_ms', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40);

    const byKey: Record<string, { latency_ms: number; created_at: string; status: string }[]> = {};
    for (const p of probes || []) {
      if (p.latency_ms == null) continue;
      if (!byKey[p.probe_key]) byKey[p.probe_key] = [];
      byKey[p.probe_key].push({
        latency_ms: p.latency_ms,
        created_at: p.created_at,
        status: p.status,
      });
    }

    const recentLatency = Object.entries(byKey).map(([probe_key, samples]) => {
      const vals = samples.map((s) => s.latency_ms).sort((a, b) => a - b);
      const mid = vals[Math.floor(vals.length / 2)] ?? null;
      return {
        probe_key,
        samples: samples.length,
        latestMs: samples[0]?.latency_ms ?? null,
        p50Ms: mid,
        history: samples.slice(0, 12).reverse(),
      };
    });

    return secureJson({
      process: {
        memory,
        uptimeSec,
        nodeVersion: typeof process !== 'undefined' ? process.version : null,
      },
      recentLatency,
      empty: recentLatency.length === 0,
      note:
        recentLatency.length === 0
          ? 'No probe latency samples yet. Run /api/health-probes?persist=1 to record.'
          : undefined,
      checked_at: new Date().toISOString(),
    });
  } catch {
    return serverErrorResponse();
  }
}
