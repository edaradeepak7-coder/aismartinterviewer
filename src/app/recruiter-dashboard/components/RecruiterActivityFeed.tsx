'use client';
import React, { useEffect, useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { CheckCircle, Clock, Zap, FileCheck, Loader, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ActivityItem {
  id: string;
  candidateName: string;
  role: string;
  type: string;
  score?: number;
  time: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; iconBg: string }> = {
  completed: { icon: <CheckCircle size={13} />, iconBg: 'bg-primary/10 text-primary' },
  evaluated: { icon: <FileCheck size={13} />, iconBg: 'bg-success-bg text-success' },
  scheduled: { icon: <Clock size={13} />, iconBg: 'bg-info-bg text-info' },
  in_progress: { icon: <Loader size={13} />, iconBg: 'bg-warning-bg text-warning' },
};

export default function RecruiterActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchActivity = async () => {
      try {
        const { data } = await supabase
          .from('interviews')
          .select('id, role, status, overall_score, updated_at, candidates(name)')
          .in('status', ['completed', 'evaluated', 'scheduled', 'in_progress'])
          .order('updated_at', { ascending: false })
          .limit(8);

        if (data) {
          const mapped: ActivityItem[] = data.map((iv: any) => ({
            id: iv.id,
            candidateName: iv.candidates?.name || 'Candidate',
            role: iv.role?.trim() || 'Role not set',
            type: iv.status,
            score: iv.overall_score || undefined,
            time: formatTime(iv.updated_at),
          }));
          setItems(mapped);
        }
      } catch (err) {
        console.error('Recruiter activity error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();

    const channel = supabase
      .channel('recruiter-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchActivity())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  function formatTime(ts: string): string {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 h-full flex flex-col fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-600 text-foreground">Recent Activity</h3>
        <span className="text-[11px] font-500 text-muted-foreground">Latest interviews</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 py-4">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground text-center py-4 flex-1">No recent activity</p>
      ) : (
        <ul className="space-y-3 flex-1">
          {items.map((item) => {
            const cfg = typeConfig[item.type] ?? { icon: <Zap size={13} />, iconBg: 'bg-muted text-muted-foreground' };
            return (
              <li key={item.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0 fade-in">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-500 text-foreground truncate">{item.candidateName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={item.type as any} size="sm" />
                    {item.score !== undefined && (
                      <span className="tabular-nums text-[11px] font-600 text-foreground">{item.score}/100</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">{item.time}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}