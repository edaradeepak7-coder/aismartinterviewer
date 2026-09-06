'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { Briefcase, Users, Calendar, CheckCircle, TrendingUp, BarChart2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { interviewService, candidateService } from '@/lib/services/interviewService';
import { createClient } from '@/lib/supabase/client';

const POLL_INTERVAL_MS = 30_000; // 30s fallback polling when realtime drops

export default function RecruiterKPIGrid() {
  const [stats, setStats] = useState({
    total: 0, scheduled: 0, inProgress: 0, completed: 0, evaluated: 0, avgScore: 0, completionRate: 0,
  });
  const [candidateCount, setCandidateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const channelRef = useRef<any>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    const [s, candidates] = await Promise.all([
      interviewService?.getStats(),
      candidateService?.getAll(),
    ]);
    setStats(s);
    setCandidateCount(candidates?.length);
    setLoading(false);
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => {
      fetchStats();
    }, POLL_INTERVAL_MS);
  }, [fetchStats]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const supabase = createClient();
    const channel = supabase?.channel('recruiter-kpi-realtime')
      ?.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interviews' },
        () => {
          setLiveUpdate(true);
          fetchStats()?.then(() => setTimeout(() => setLiveUpdate(false), 2000));
        }
      )
      ?.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidates' },
        () => {
          setLiveUpdate(true);
          fetchStats()?.then(() => setTimeout(() => setLiveUpdate(false), 2000));
        }
      )
      ?.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          stopPolling();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeConnected(false);
          startPolling();
        }
      });

    channelRef.current = channel;

    return () => {
      stopPolling();
      if (channelRef?.current) {
        supabase?.removeChannel(channelRef?.current);
      }
    };
  }, [fetchStats, startPolling, stopPolling]);

  return (
    <div className="space-y-2">
      {/* Live indicator */}
      <div className="flex items-center justify-end gap-3">
        {!realtimeConnected && (
          <div className="flex items-center gap-1.5 text-[11px] font-500 text-amber-400">
            <WifiOff size={11} />
            <span>Polling (realtime unavailable)</span>
          </div>
        )}
        <div className={['flex items-center gap-1.5 text-[11px] font-500 transition-all duration-300', liveUpdate ? 'text-success' : realtimeConnected ? 'text-muted-foreground/50' : 'text-amber-400/50']?.join(' ')}>
          {realtimeConnected ? (
            <Wifi size={11} className={liveUpdate ? 'animate-pulse' : ''} />
          ) : (
            <RefreshCw size={11} className="animate-spin" />
          )}
          <span>{liveUpdate ? 'Updating...' : realtimeConnected ? 'Live' : 'Auto-refresh'}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Total Candidates"
          value={loading ? '—' : candidateCount}
          delta={loading ? undefined : 0}
          deltaLabel="in database"
          icon={<Users size={16} />}
          variant="default"
        />
        <MetricCard
          label="Scheduled"
          value={loading ? '—' : stats?.scheduled}
          subtext="upcoming interviews"
          icon={<Calendar size={16} />}
          variant="default"
        />
        <MetricCard
          label="In Progress"
          value={loading ? '—' : stats?.inProgress}
          subtext="active now"
          icon={<Briefcase size={16} />}
          variant={stats?.inProgress > 0 ? 'success' : 'default'}
        />
        <MetricCard
          label="Completed"
          value={loading ? '—' : stats?.completed + stats?.evaluated}
          subtext="interviews done"
          icon={<CheckCircle size={16} />}
          variant={stats?.completed + stats?.evaluated >= 5 ? 'success' : 'default'}
        />
        <MetricCard
          label="Avg. Overall Score"
          value={loading ? '—' : stats?.avgScore}
          unit="/100"
          delta={loading ? undefined : 0}
          deltaLabel="overall"
          icon={<BarChart2 size={16} />}
          variant={stats?.avgScore >= 75 ? 'success' : stats?.avgScore >= 60 ? 'default' : 'warning'}
        />
        <MetricCard
          label="Completion Rate"
          value={loading ? '—' : `${stats?.completionRate}%`}
          delta={loading ? undefined : 0}
          deltaLabel="all time"
          icon={<TrendingUp size={16} />}
          variant={stats?.completionRate >= 80 ? 'default' : 'warning'}
        />
      </div>
    </div>
  );
}