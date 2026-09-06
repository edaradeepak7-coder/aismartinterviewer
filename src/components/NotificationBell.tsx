'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, X, Award, Gift, CalendarCheck, BarChart2, Info, Loader2, ClipboardList, Star, Clock, Inbox, Wifi } from 'lucide-react';
import { notificationService, DBNotification } from '@/lib/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

type NotifType = DBNotification['type'];

const typeConfig: Record<NotifType, { icon: React.ReactNode; dot: string; iconBg: string }> = {
  score_ready: { icon: <BarChart2 size={14} />, dot: 'bg-blue-400', iconBg: 'bg-blue-400/15 text-blue-400' },
  offer_received: { icon: <Gift size={14} />, dot: 'bg-emerald-400', iconBg: 'bg-emerald-400/15 text-emerald-400' },
  booking_confirmed: { icon: <CalendarCheck size={14} />, dot: 'bg-primary', iconBg: 'bg-primary/15 text-primary' },
  interview_scheduled: { icon: <CalendarCheck size={14} />, dot: 'bg-blue-500', iconBg: 'bg-blue-500/15 text-blue-500' },
  interview_completed: { icon: <Award size={14} />, dot: 'bg-amber-400', iconBg: 'bg-amber-400/15 text-amber-400' },
  offer_accepted: { icon: <Award size={14} />, dot: 'bg-emerald-500', iconBg: 'bg-emerald-500/15 text-emerald-500' },
  offer_declined: { icon: <X size={14} />, dot: 'bg-red-400', iconBg: 'bg-red-400/15 text-red-400' },
  system: { icon: <Info size={14} />, dot: 'bg-slate-400', iconBg: 'bg-slate-400/15 text-slate-400' },
  assessment_assigned: { icon: <ClipboardList size={14} />, dot: 'bg-violet-500', iconBg: 'bg-violet-500/15 text-violet-500' },
  shortlisted: { icon: <Star size={14} />, dot: 'bg-amber-500', iconBg: 'bg-amber-500/15 text-amber-500' },
  task_due: { icon: <Clock size={14} />, dot: 'bg-rose-500', iconBg: 'bg-rose-500/15 text-rose-500' },
};

const deepLinkMap: Partial<Record<NotifType, string>> = {
  interview_scheduled: '/book-interview',
  assessment_assigned: '/assessments',
  shortlisted: '/jobs',
  offer_accepted: '/job-offers',
  offer_received: '/job-offers',
  task_due: '/crm',
  score_ready: '/interview-results',
  booking_confirmed: '/book-interview',
  interview_completed: '/interview-results',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Preview mock notifications for bell dropdown when DB is empty
const PREVIEW_MOCKS: DBNotification[] = [
  {
    id: 'pm-1', user_id: 'demo', type: 'interview_scheduled',
    title: 'Interview Scheduled',
    message: 'Technical interview with Acme Corp tomorrow at 10:00 AM.',
    is_read: false, action_url: '/book-interview', metadata: {},
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'pm-2', user_id: 'demo', type: 'assessment_assigned',
    title: 'Assessment Assigned',
    message: 'New coding assessment due in 48 hours.',
    is_read: false, action_url: '/assessments', metadata: {},
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'pm-3', user_id: 'demo', type: 'shortlisted',
    title: 'You\'ve Been Shortlisted!',
    message: 'Shortlisted for Full Stack Developer at TechVentures.',
    is_read: false, action_url: '/jobs', metadata: {},
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'pm-4', user_id: 'demo', type: 'task_due',
    title: 'Task Due Soon',
    message: '"Submit portfolio samples" due in 2 hours.',
    is_read: true, action_url: '/crm', metadata: {},
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const { user } = useAuth();
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const [notifs, count] = await Promise.all([
      notificationService.getAll(),
      notificationService.getUnreadCount(),
    ]);
    if (notifs.length === 0) {
      setNotifications(PREVIEW_MOCKS);
      setUnreadCount(PREVIEW_MOCKS.filter(n => !n.is_read).length);
      setUseMock(true);
    } else {
      setNotifications(notifs);
      setUnreadCount(count);
      setUseMock(false);
    }
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Real-time Supabase subscription for badge + dropdown refresh
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`bell-notifications-${user.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as DBNotification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
        setUseMock(false);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as DBNotification;
        setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
        // Recount unread
        setUnreadCount(prev => {
          const wasUnread = !updated.is_read;
          return wasUnread ? prev : Math.max(0, prev - 1);
        });
      })
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user?.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    if (!useMock) await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    if (!useMock) await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  };

  const handleNotifClick = async (notif: DBNotification) => {
    if (!notif.is_read) await handleMarkRead(notif.id);
    const dest = notif.action_url || deepLinkMap[notif.type];
    if (dest) { router.push(dest); setOpen(false); }
  };

  return (
    <div className={`relative ${className || ''}`} ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-danger rounded-full border border-card flex items-center justify-center text-[10px] font-700 text-white px-0.5 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {/* Realtime dot */}
        {realtimeConnected && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-card" title="Live updates active" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-primary" />
              <span className="text-sm font-600 text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-primary/15 text-primary text-[11px] font-600 rounded-full px-1.5 py-0.5">
                  {unreadCount} new
                </span>
              )}
              {realtimeConnected && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-500">
                  <Wifi size={9} /> Live
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {markingAll ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} />}
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 8).map((notif) => {
                const cfg = typeConfig[notif.type] || typeConfig.system;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${!notif.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconBg}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[13px] leading-snug ${notif.is_read ? 'text-muted-foreground' : 'text-foreground font-500'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
            <button
              onClick={() => { router.push('/inbox'); setOpen(false); }}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-500"
            >
              <Inbox size={12} /> Open Inbox
            </button>
            <button
              onClick={() => { router.push('/notifications'); setOpen(false); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              All notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
