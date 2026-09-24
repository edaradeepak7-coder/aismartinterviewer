'use client';
import React, { useEffect, useState } from 'react';
import { CheckCircle, FileText, Mail, BookOpen, User, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActivityItem {
  id: string;
  type: string;
  icon: string;
  text: string;
  time: string;
}

const iconMap: Record<string, React.ReactNode> = {
  CheckCircle: <CheckCircle size={14} />,
  FileText: <FileText size={14} />,
  Mail: <Mail size={14} />,
  BookOpen: <BookOpen size={14} />,
  User: <User size={14} />,
};

const iconBg: Record<string, string> = {
  interview_completed: 'bg-success-bg text-success',
  score_available: 'bg-primary/10 text-primary',
  invitation: 'bg-info-bg text-info',
  prep_completed: 'bg-warning-bg text-warning',
  profile_updated: 'bg-muted text-muted-foreground',
};

export default function CandidateActivityFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const supabase = createClient();

    const fetchActivity = async () => {
      try {
        const { data: interviews } = await supabase
          .from('interviews')
          .select('id, status, created_at, role, company')
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: notifications } = await supabase
          .from('notifications')
          .select('id, type, message, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        const activityItems: ActivityItem[] = [];

        (interviews || []).forEach((iv: any) => {
          if (iv.status === 'completed' || iv.status === 'evaluated') {
            activityItems.push({
              id: `iv-${iv.id}`,
              type: 'interview_completed',
              icon: 'CheckCircle',
              text: `Completed interview for ${iv.role}${iv.company ? ` at ${iv.company}` : ''}`,
              time: formatTime(iv.created_at),
            });
          }
        });

        (notifications || []).forEach((n: any) => {
          activityItems.push({
            id: `notif-${n.id}`,
            type: n.type || 'profile_updated',
            icon: n.type === 'invitation' ? 'Mail' : n.type === 'score_available' ? 'FileText' : 'User',
            text: n.message || 'New notification',
            time: formatTime(n.created_at),
          });
        });

        // Sort by recency and take top 5
        activityItems.sort((a, b) => 0);
        setItems(activityItems.slice(0, 5));
      } catch (err) {
        console.error('Activity feed error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();

    // Real-time subscription
    const channel = supabase
      .channel('candidate-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchActivity();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'interviews' }, () => {
        fetchActivity();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

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
    <div className="bg-card rounded-lg border border-border p-4 fade-in">
      <h3 className="text-sm font-600 text-foreground mb-3">Recent Activity</h3>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground text-center py-4">No recent activity</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 fade-in">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconBg[item.type] || 'bg-muted text-muted-foreground'}`}>
                {iconMap[item.icon] || <User size={14} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-foreground leading-snug">{item.text}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}