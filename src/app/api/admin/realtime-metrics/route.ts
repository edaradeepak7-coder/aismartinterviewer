/**
 * GET /api/admin/realtime-metrics
 * Returns live infrastructure metrics for the admin monitoring screen.
 *
 * Metrics returned:
 *  - jobQueue: pending / running / failed counts
 *  - redis: hit rate, memory usage, connected clients
 *  - aiLatency: per-provider p50/p95 latency (ms)
 *  - sessions: concurrent active interview sessions
 *  - signaling: connected peers on signaling server
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedisClient } from '@/lib/redis/client';

interface JobQueueMetrics {
  pending: number;
  running: number;
  failed: number;
  completed_last_hour: number;
  avg_wait_ms: number;
}

interface RedisMetrics {
  available: boolean;
  hitRate: number;
  missRate: number;
  totalCommands: number;
  connectedClients: number;
  usedMemoryMb: number;
  keyCount: number;
}

interface AILatencyMetrics {
  provider: string;
  p50Ms: number;
  p95Ms: number;
  errorRate: number;
  requestsLastMinute: number;
}

interface SessionMetrics {
  activeSessions: number;
  activeInterviews: number;
  signalingPeers: number;
}

export interface RealtimeMetrics {
  timestamp: string;
  jobQueue: JobQueueMetrics;
  redis: RedisMetrics;
  aiLatency: AILatencyMetrics[];
  sessions: SessionMetrics;
}

async function getJobQueueMetrics(supabase: ReturnType<typeof createClient>): Promise<JobQueueMetrics> {
  try {
    const [pendingRes, runningRes, failedRes, completedRes] = await Promise.all([
      supabase.from('background_jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('background_jobs').select('id', { count: 'exact', head: true }).eq('status', 'running'),
      supabase.from('background_jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase
        .from('background_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 3_600_000).toISOString()),
    ]);

    // Estimate avg wait time from pending jobs
    const waitRes = await supabase
      .from('background_jobs')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    let avgWaitMs = 0;
    if (waitRes.data && waitRes.data.length > 0) {
      const now = Date.now();
      avgWaitMs = Math.round(
        waitRes.data.reduce((sum, j) => sum + (now - new Date(j.created_at).getTime()), 0) /
          waitRes.data.length
      );
    }

    return {
      pending: pendingRes.count ?? 0,
      running: runningRes.count ?? 0,
      failed: failedRes.count ?? 0,
      completed_last_hour: completedRes.count ?? 0,
      avg_wait_ms: avgWaitMs,
    };
  } catch {
    return { pending: 0, running: 0, failed: 0, completed_last_hour: 0, avg_wait_ms: 0 };
  }
}

async function getRedisMetrics(): Promise<RedisMetrics> {
  const client = getRedisClient();
  if (!client) {
    return {
      available: false,
      hitRate: 0,
      missRate: 0,
      totalCommands: 0,
      connectedClients: 0,
      usedMemoryMb: 0,
      keyCount: 0,
    };
  }

  try {
    const [infoStr, keyCount] = await Promise.all([
      client.info('all'),
      client.dbsize(),
    ]);

    const parse = (key: string): number => {
      const match = infoStr.match(new RegExp(`${key}:(\\d+(?:\\.\\d+)?)`));
      return match ? parseFloat(match[1]) : 0;
    };

    const hits = parse('keyspace_hits');
    const misses = parse('keyspace_misses');
    const total = hits + misses;
    const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
    const missRate = total > 0 ? 100 - hitRate : 0;

    return {
      available: true,
      hitRate,
      missRate,
      totalCommands: parse('total_commands_processed'),
      connectedClients: parse('connected_clients'),
      usedMemoryMb: Math.round(parse('used_memory') / 1_048_576),
      keyCount,
    };
  } catch {
    return {
      available: false,
      hitRate: 0,
      missRate: 0,
      totalCommands: 0,
      connectedClients: 0,
      usedMemoryMb: 0,
      keyCount: 0,
    };
  }
}

async function getAILatencyMetrics(): Promise<AILatencyMetrics[]> {
  // Probe each AI provider with a minimal request and measure response time.
  // In production, replace with actual metrics from your observability layer.
  const providers = [
    { provider: 'OpenAI', key: process.env.OPENAI_API_KEY, url: 'https://api.openai.com/v1/models' },
    { provider: 'Groq', key: process.env.GROQ_API_KEY, url: 'https://api.groq.com/openai/v1/models' },
    { provider: 'ElevenLabs', key: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY, url: 'https://api.elevenlabs.io/v1/voices' },
  ];

  const results: AILatencyMetrics[] = [];

  await Promise.all(
    providers.map(async ({ provider, key, url }) => {
      if (!key || key.startsWith('your-')) {
        results.push({ provider, p50Ms: 0, p95Ms: 0, errorRate: 100, requestsLastMinute: 0 });
        return;
      }
      const samples: number[] = [];
      let errors = 0;
      const PROBES = 3;

      for (let i = 0; i < PROBES; i++) {
        const t0 = Date.now();
        try {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) errors++;
          else samples.push(Date.now() - t0);
        } catch {
          errors++;
        }
      }

      samples.sort((a, b) => a - b);
      const p50 = samples[Math.floor(samples.length * 0.5)] ?? 0;
      const p95 = samples[Math.floor(samples.length * 0.95)] ?? samples[samples.length - 1] ?? 0;

      results.push({
        provider,
        p50Ms: p50,
        p95Ms: p95,
        errorRate: Math.round((errors / PROBES) * 100),
        requestsLastMinute: 0, // extend with real metrics if available
      });
    })
  );

  return results;
}

async function getSessionMetrics(supabase: ReturnType<typeof createClient>): Promise<SessionMetrics> {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // active in last 30 min

    const [sessionsRes, interviewsRes] = await Promise.all([
      supabase
        .from('user_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('last_active', cutoff),
      supabase
        .from('interviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'in_progress'),
    ]);

    // Signaling peer count — query signaling server if configured
    let signalingPeers = 0;
    const signalingBase =
      process.env.SIGNALING_SERVER_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
    if (signalingBase) {
      try {
        const res = await fetch(`${signalingBase}/stats`, {
          headers: { 'x-api-key': process.env.SIGNALING_SERVER_API_KEY ?? '' },
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) {
          const data = await res.json();
          signalingPeers = data.connectedPeers ?? 0;
        }
      } catch { /* signaling server offline */ }
    }

    return {
      activeSessions: sessionsRes.count ?? 0,
      activeInterviews: interviewsRes.count ?? 0,
      signalingPeers,
    };
  } catch {
    return { activeSessions: 0, activeInterviews: 0, signalingPeers: 0 };
  }
}

export async function GET() {
  const supabase = createClient();

  const [jobQueue, redis, aiLatency, sessions] = await Promise.all([
    getJobQueueMetrics(supabase),
    getRedisMetrics(),
    getAILatencyMetrics(),
    getSessionMetrics(supabase),
  ]);

  const metrics: RealtimeMetrics = {
    timestamp: new Date().toISOString(),
    jobQueue,
    redis,
    aiLatency,
    sessions,
  };

  return NextResponse.json(metrics, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
