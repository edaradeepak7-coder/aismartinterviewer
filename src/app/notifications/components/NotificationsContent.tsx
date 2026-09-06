'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCheck, BarChart2, Gift, CalendarCheck, Award, X, Info,
  Loader2, WifiOff, ClipboardList, Star, Clock, ChevronRight, Filter,
  CheckCircle2, Circle,
} from 'lucide-react';
import { notificationService, DBNotification } from '@/lib/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

type NotifType = DBNotification['type'];

interface TypeConfig {
  icon: React.ReactNode;
  dot: string;
  iconBg: string;
  label: string;
  deepLink?: string;
}

const typeConfig: Record<NotifType, TypeConfig> = {
  interview_scheduled: {
    icon: <CalendarCheck size={15} />,
    dot: 'bg-blue-500',
    iconBg: 'bg-blue-500/15 text-blue-500',
    label: 'Interview Scheduled',
    deepLink: '/book-interview',
  },
  assessment_assigned: {
    icon: <ClipboardList size={15} />,
    dot: 'bg-violet-500',
    iconBg: 'bg-violet-500/15 text-violet-500',
    label: 'Assessment Assigned',
    deepLink: '/assessments',
  },
  shortlisted: {
    icon: <Star size={15} />,
    dot: 'bg-amber-500',
    iconBg: 'bg-amber-500/15 text-amber-500',
    label: 'Shortlisted',
    deepLink: '/jobs',
  },
  offer_accepted: {
    icon: <Award size={15} />,
    dot: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/15 text-emerald-500',
    label: 'Offer Accepted',
    deepLink: '/job-offers',
  },
  task_due: {
    icon: <Clock size={15} />,
    dot: 'bg-rose-500',
    iconBg: 'bg-rose-500/15 text-rose-500',
    label: 'Task Due',
    deepLink: '/crm',
  },
  score_ready: {
    icon: <BarChart2 size={15} />,
    dot: 'bg-blue-400',
    iconBg: 'bg-blue-400/15 text-blue-400',
    label: 'Score Ready',
    deepLink: '/interview-results',
  },
  offer_received: {
    icon: <Gift size={15} />,
    dot: 'bg-emerald-400',
    iconBg: 'bg-emerald-400/15 text-emerald-400',
    label: 'Offer Received',
    deepLink: '/job-offers',
  },
  booking_confirmed: {
    icon: <CalendarCheck size={15} />,
    dot: 'bg-primary',
    iconBg: 'bg-primary/15 text-primary',
    label: 'Booking Confirmed',
    deepLink: '/book-interview',
  },
  interview_completed: {
    icon: <Award size={15} />,
    dot: 'bg-amber-400',
    iconBg: 'bg-amber-400/15 text-amber-400',
    label: 'Interview Completed',
    deepLink: '/interview-results',
  },
  offer_declined: {
    icon: <X size={15} />,
    dot: 'bg-red-400',
    iconBg: 'bg-red-400/15 text-red-400',
    label: 'Offer Declined',
    deepLink: '/job-offers',
  },
  system: {
    icon: <Info size={15} />,
    dot: 'bg-slate-400',
    iconBg: 'bg-slate-400/15 text-slate-400',
    label: 'System',
  },
};

// Mock notifications for demo (shown when DB is empty)
const MOCK_NOTIFICATIONS: DBNotification[] = [
  {
    id: 'mock-1',
    user_id: 'demo',
    type: 'interview_scheduled',
    title: 'Interview Scheduled',
    message: 'Your technical interview with Acme Corp has been scheduled for tomorrow at 10:00 AM.',
    is_read: false,
    action_url: '/book-interview',
    metadata: { company: 'Acme Corp', role: 'Senior Engineer' },
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'mock-2',
    user_id: 'demo',
    type: 'assessment_assigned',
    title: 'Assessment Assigned',
    message: 'A new coding assessment "Data Structures & Algorithms" has been assigned to you. Due in 48 hours.',
    is_read: false,
    action_url: '/assessments',
    metadata: { assessment: 'Data Structures & Algorithms', due_hours: 48 },
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'mock-3',
    user_id: 'demo',
    type: 'shortlisted',
    title: 'You\'ve Been Shortlisted!',
    message: 'Congratulations! You have been shortlisted for the Full Stack Developer role at TechVentures.',
    is_read: false,
    action_url: '/jobs',
    metadata: { company: 'TechVentures', role: 'Full Stack Developer' },
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'mock-4',
    user_id: 'demo',
    type: 'offer_accepted',
    title: 'Offer Accepted',
    message: 'Your offer for the Backend Engineer position at CloudSystems has been accepted. Welcome aboard!',
    is_read: true,
    action_url: '/job-offers',
    metadata: { company: 'CloudSystems', role: 'Backend Engineer' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'mock-5',
    user_id: 'demo',
    type: 'task_due',
    title: 'Task Due Soon',
    message: 'Reminder: "Submit portfolio samples" is due in 2 hours. Don\'t miss the deadline.',
    is_read: false,
    action_url: '/crm',
    metadata: { task: 'Submit portfolio samples', due_hours: 2 },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'mock-6',
    user_id: 'demo',
    type: 'score_ready',
    title: 'Interview Score Ready',
    message: 'Your interview score for the React Developer position is now available. You scored 87/100.',
    is_read: true,
    action_url: '/interview-results',
    metadata: { score: 87, role: 'React Developer' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'mock-7',
    user_id: 'demo',
    type: 'assessment_assigned',
    title: 'New Assessment: System Design',
    message: 'A system design assessment has been assigned for the Principal Engineer role at MegaCorp.',
    is_read: true,
    action_url: '/assessments',
    metadata: { assessment: 'System Design', company: 'MegaCorp' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: 'mock-8',
    user_id: 'demo',
    type: 'interview_scheduled',
    title: 'HR Interview Scheduled',
    message: 'Your HR round with GlobalTech has been confirmed for Friday at 3:00 PM.',
    is_read: true,
    action_url: '/book-interview',
    metadata: { company: 'GlobalTech', round: 'HR' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByDate(notifications: DBNotification[]): { label: string; items: DBNotification[] }[] {
  const groups: Record<string, DBNotification[]> = {};
  const now = new Date();

  notifications.forEach(n => {
    const d = new Date(n.created_at);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    let label: string;
    if (diffDays === 0) label = 'Today';
    else if (diffDays === 1) label = 'Yesterday';
    else if (diffDays < 7) label = 'This Week';
    else if (diffDays < 30) label = 'This Month';
    else label = 'Older';

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });

  const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
  return order.filter(l => groups[l]).map(l => ({ label: l, items: groups[l] }));
}

type FilterType = 'all' | 'unread' | NotifType;

const FILTER_TABS: { key: FilterType; label: string; icon?: React.ReactNode }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'interview_scheduled', label: 'Interviews', icon: <CalendarCheck size={12} /> },
  { key: 'assessment_assigned', label: 'Assessments', icon: <ClipboardList size={12} /> },
  { key: 'shortlisted', label: 'Shortlisted', icon: <Star size={12} /> },
  { key: 'offer_accepted', label: 'Offers', icon: <Award size={12} /> },
  { key: 'task_due', label: 'Tasks', icon: <Clock size={12} /> },
];

const POLL_INTERVAL_MS = 20_000;

export default function NotificationsContent() {
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const channelRef = useRef<any>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    const data = await notificationService.getAll();
    if (data.length === 0 && !user) {
      setNotifications(MOCK_NOTIFICATIONS);
      setUseMock(true);
    } else if (data.length === 0) {
      setNotifications(MOCK_NOTIFICATIONS);
      setUseMock(true);
    } else {
      setNotifications(data);
      setUseMock(false);
    }
    setLoading(false);
  }, [user]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => { loadNotifications(); }, POLL_INTERVAL_MS);
  }, [loadNotifications]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel('notifications-page-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as DBNotification, ...prev]);
        setUseMock(false);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        loadNotifications();
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') { setRealtimeConnected(true); stopPolling(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { setRealtimeConnected(false); startPolling(); }
      });
    channelRef.current = channel;
    return () => { stopPolling(); supabase.removeChannel(channel); };
  }, [user?.id, loadNotifications, startPolling, stopPolling]);

  const handleMarkRead = async (id: string) => {
    if (useMock) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      return;
    }
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    if (!useMock) await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setMarkingAll(false);
  };

  const handleNotifClick = async (notif: DBNotification) => {
    if (!notif.is_read) await handleMarkRead(notif.id);
    const dest = notif.action_url || typeConfig[notif.type]?.deepLink;
    if (dest) router.push(dest);
  };

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    // For offer_accepted filter, also include offer_received
    if (filter === 'offer_accepted') return n.type === 'offer_accepted' || n.type === 'offer_received';
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const grouped = groupByDate(filtered);

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <Bell size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Notifications</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">
              {notifications.length} total · {unreadCount} unread
              {useMock && <span className="ml-2 text-[11px] bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5">Demo data</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Live / Polling indicator */}
          {!realtimeConnected ? (
            <div className="flex items-center gap-1.5 text-[11px] font-500 text-amber-500 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <WifiOff size={11} /> <span>Polling</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-500 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>
          )}

          {/* Unread count pill */}
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2 shadow-sm">
            <Bell size={15} className="text-[#0D9488]" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">{unreadCount}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Unread</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-sm text-[#6B7A99] hover:text-[#0D1B3E] border border-[#E8ECF4] rounded-xl px-3 py-2 transition-colors bg-white"
            >
              {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto scrollbar-hide">
        {FILTER_TABS.map(tab => {
          const count = tab.key === 'unread'
            ? unreadCount
            : tab.key === 'all'
            ? notifications.length
            : tab.key === 'offer_accepted'
            ? notifications.filter(n => n.type === 'offer_accepted' || n.type === 'offer_received').length
            : notifications.filter(n => n.type === tab.key).length;

          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
                filter === tab.key
                  ? 'border-[#0D9488] text-[#0D9488]'
                  : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] font-700 rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${
                  filter === tab.key ? 'bg-[#0D9488]/15 text-[#0D9488]' : 'bg-[#F0F2F8] text-[#6B7A99]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[#0D9488]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={36} className="text-[#6B7A99]/30 mx-auto mb-3" />
          <p className="text-[#0D1B3E] font-500">No notifications</p>
          <p className="text-sm text-[#6B7A99] mt-1">
            {filter === 'unread' ? 'All caught up! No unread notifications.' : 'Nothing here yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          {grouped.map(group => (
            <div key={group.label}>
              {/* Date group header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-700 text-[#6B7A99] uppercase tracking-wider">{group.label}</span>
                <div className="flex-1 h-px bg-[#E8ECF4]" />
                <span className="text-xs text-[#6B7A99]">{group.items.length}</span>
              </div>

              <div className="space-y-2">
                {group.items.map(notif => {
                  const cfg = typeConfig[notif.type] || typeConfig.system;
                  const hasDeepLink = !!(notif.action_url || cfg.deepLink);

                  return (
                    <div
                      key={notif.id}
                      className={`bg-white border rounded-2xl p-4 flex items-start gap-4 transition-all group ${
                        !notif.is_read
                          ? 'border-[#0D9488]/20 bg-gradient-to-r from-[#F0FDFB] to-white shadow-sm'
                          : 'border-[#E8ECF4] hover:border-[#D0D8E8]'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm leading-snug ${!notif.is_read ? 'font-700 text-[#0D1B3E]' : 'font-500 text-[#374151]'}`}>
                                {notif.title}
                              </p>
                              <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full ${cfg.iconBg}`}>
                                {cfg.label}
                              </span>
                              {!notif.is_read && (
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              )}
                            </div>
                            <p className="text-sm text-[#6B7A99] mt-1 leading-relaxed">{notif.message}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs text-[#6B7A99]/60">{timeAgo(notif.created_at)}</p>
                              {hasDeepLink && (
                                <button
                                  onClick={() => handleNotifClick(notif)}
                                  className="flex items-center gap-1 text-xs text-[#0D9488] hover:text-[#0B7A70] font-500 transition-colors"
                                >
                                  View details <ChevronRight size={11} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Mark read toggle */}
                          <button
                            onClick={() => !notif.is_read ? handleMarkRead(notif.id) : undefined}
                            className={`shrink-0 mt-0.5 transition-colors ${
                              notif.is_read
                                ? 'text-[#6B7A99]/30 cursor-default'
                                : 'text-[#6B7A99] hover:text-[#0D9488]'
                            }`}
                            title={notif.is_read ? 'Read' : 'Mark as read'}
                          >
                            {notif.is_read
                              ? <CheckCircle2 size={16} />
                              : <Circle size={16} />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* History footer */}
          <div className="text-center py-4 border-t border-[#E8ECF4]">
            <p className="text-xs text-[#6B7A99]">
              Showing {filtered.length} of {notifications.length} notifications
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="ml-2 text-[#0D9488] hover:underline">
                  View all
                </button>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
