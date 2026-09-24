'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Inbox, CalendarCheck, BarChart2, Award, CreditCard, MessageSquare, CheckCheck, Circle, CheckCircle2, Filter, Search, Loader2, Clock, Star, Gift, ClipboardList, Info, X, RefreshCw, Wifi, WifiOff, ArrowRight,  } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoMode } from '@/lib/demoMode';

// ─── Types ────────────────────────────────────────────────────────────────────
type InboxCategory = 'all' | 'unread' | 'interview_reminder' | 'score_notification' | 'feedback_decision' | 'seat_purchase' | 'system';

interface InboxMessage {
  id: string;
  user_id: string;
  category: InboxCategory;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// ─── Category Config ──────────────────────────────────────────────────────────
const categoryConfig: Record<string, {
  icon: React.ReactNode;
  dot: string;
  iconBg: string;
  label: string;
  color: string;
}> = {
  interview_reminder: {
    icon: <CalendarCheck size={15} />,
    dot: 'bg-blue-500',
    iconBg: 'bg-blue-500/15 text-blue-600',
    label: 'Interview Reminder',
    color: 'text-blue-600',
  },
  score_notification: {
    icon: <BarChart2 size={15} />,
    dot: 'bg-violet-500',
    iconBg: 'bg-violet-500/15 text-violet-600',
    label: 'Score Notification',
    color: 'text-violet-600',
  },
  feedback_decision: {
    icon: <MessageSquare size={15} />,
    dot: 'bg-amber-500',
    iconBg: 'bg-amber-500/15 text-amber-600',
    label: 'Feedback & Decision',
    color: 'text-amber-600',
  },
  seat_purchase: {
    icon: <CreditCard size={15} />,
    dot: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/15 text-emerald-600',
    label: 'Seat Purchase',
    color: 'text-emerald-600',
  },
  system: {
    icon: <Info size={15} />,
    dot: 'bg-slate-400',
    iconBg: 'bg-slate-400/15 text-slate-500',
    label: 'System',
    color: 'text-slate-500',
  },
  interview_reminder: {
    icon: <Clock size={15} />,
    dot: 'bg-amber-400',
    iconBg: 'bg-amber-400/15 text-amber-600',
    label: 'Interview Reminder',
    color: 'text-amber-600',
  },
  interview_scheduled: {
    icon: <CalendarCheck size={15} />,
    dot: 'bg-blue-500',
    iconBg: 'bg-blue-500/15 text-blue-600',
    label: 'Interview Scheduled',
    color: 'text-blue-600',
  },
  assessment_assigned: {
    icon: <ClipboardList size={15} />,
    dot: 'bg-violet-500',
    iconBg: 'bg-violet-500/15 text-violet-600',
    label: 'Assessment',
    color: 'text-violet-600',
  },
  shortlisted: {
    icon: <Star size={15} />,
    dot: 'bg-amber-500',
    iconBg: 'bg-amber-500/15 text-amber-600',
    label: 'Shortlisted',
    color: 'text-amber-600',
  },
  offer_accepted: {
    icon: <Award size={15} />,
    dot: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/15 text-emerald-600',
    label: 'Offer Accepted',
    color: 'text-emerald-600',
  },
  offer_received: {
    icon: <Gift size={15} />,
    dot: 'bg-emerald-400',
    iconBg: 'bg-emerald-400/15 text-emerald-500',
    label: 'Offer Received',
    color: 'text-emerald-500',
  },
  offer_declined: {
    icon: <X size={15} />,
    dot: 'bg-red-400',
    iconBg: 'bg-red-400/15 text-red-500',
    label: 'Offer Declined',
    color: 'text-red-500',
  },
  score_ready: {
    icon: <BarChart2 size={15} />,
    dot: 'bg-blue-400',
    iconBg: 'bg-blue-400/15 text-blue-500',
    label: 'Score Ready',
    color: 'text-blue-500',
  },
  booking_confirmed: {
    icon: <CalendarCheck size={15} />,
    dot: 'bg-teal-500',
    iconBg: 'bg-teal-500/15 text-teal-600',
    label: 'Booking Confirmed',
    color: 'text-teal-600',
  },
  interview_completed: {
    icon: <Award size={15} />,
    dot: 'bg-amber-400',
    iconBg: 'bg-amber-400/15 text-amber-500',
    label: 'Interview Completed',
    color: 'text-amber-500',
  },
  task_due: {
    icon: <Clock size={15} />,
    dot: 'bg-rose-500',
    iconBg: 'bg-rose-500/15 text-rose-600',
    label: 'Task Due',
    color: 'text-rose-600',
  },
};

// ─── Mock Inbox Messages ──────────────────────────────────────────────────────
const MOCK_INBOX: InboxMessage[] = [
  {
    id: 'ib-1', user_id: 'demo', category: 'interview_reminder', type: 'interview_reminder',
    title: '⏰ Interview Reminder — Tomorrow at 10:00 AM',
    message: 'You have a Technical Interview with Acme Corp scheduled for tomorrow at 10:00 AM IST. Please ensure your microphone and internet connection are ready.',
    is_read: false, action_url: '/book-interview', action_label: 'View Interview Details',
    metadata: { company: 'Acme Corp', role: 'Senior Engineer', scheduled_at: new Date(Date.now() + 86400000).toISOString() },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'ib-2', user_id: 'demo', category: 'score_notification', type: 'score_ready',
    title: '📊 Your Interview Score is Ready',
    message: 'Your performance report for the React Developer role at TechVentures is now available. You scored 87/100 — above the benchmark of 72.',
    is_read: false, action_url: '/interview-results', action_label: 'View Full Report',
    metadata: { score: 87, benchmark: 72, role: 'React Developer', company: 'TechVentures' },
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'ib-3', user_id: 'demo', category: 'feedback_decision', type: 'shortlisted',
    title: '🎉 You\'ve Been Shortlisted!',
    message: 'Congratulations! The recruiter at CloudSystems has shortlisted you for the Backend Engineer position. Next step: Technical Round 2.',
    is_read: false, action_url: '/jobs', action_label: 'View Job Details',
    metadata: { company: 'CloudSystems', role: 'Backend Engineer', decision: 'shortlisted' },
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'ib-4', user_id: 'demo', category: 'seat_purchase', type: 'seat_purchase',
    title: '✅ Seat Purchase Confirmed',
    message: 'Your institution has successfully purchased 50 additional seats. Transaction ID: TXN-2026090112345. Amount: ₹14,950.',
    is_read: true, action_url: '/institution-subscription', action_label: 'View Subscription',
    metadata: { seats: 50, amount: 14950, transaction_id: 'TXN-2026090112345' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'ib-5', user_id: 'demo', category: 'interview_reminder', type: 'interview_scheduled',
    title: '📅 Interview Scheduled — HR Round',
    message: 'Your HR interview with GlobalTech has been confirmed for Friday at 3:00 PM IST. A calendar invite has been sent to your email.',
    is_read: true, action_url: '/interview-calendar', action_label: 'Open Calendar',
    metadata: { company: 'GlobalTech', round: 'HR', scheduled_at: new Date(Date.now() + 3 * 86400000).toISOString() },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'ib-6', user_id: 'demo', category: 'feedback_decision', type: 'offer_received',
    title: '🎁 Offer Letter Received',
    message: 'You have received an offer for the Full Stack Developer position at MegaCorp. CTC: ₹18 LPA. Please review and respond within 5 days.',
    is_read: false, action_url: '/job-offers', action_label: 'Review Offer',
    metadata: { company: 'MegaCorp', role: 'Full Stack Developer', ctc: '18 LPA', expires_in_days: 5 },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'ib-7', user_id: 'demo', category: 'score_notification', type: 'assessment_assigned',
    title: '📝 New Assessment Assigned',
    message: 'A System Design assessment has been assigned for the Principal Engineer role at InnovateTech. Due in 48 hours.',
    is_read: true, action_url: '/assessments', action_label: 'Start Assessment',
    metadata: { assessment: 'System Design', company: 'InnovateTech', due_hours: 48 },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'ib-8', user_id: 'demo', category: 'feedback_decision', type: 'feedback_decision',
    title: '📋 Recruiter Feedback Available',
    message: 'Sarah Reeves from TechCorp has submitted structured feedback on your interview. Overall rating: 4.2/5. Decision: Proceed to Final Round.',
    is_read: true, action_url: '/interview-feedback', action_label: 'View Feedback',
    metadata: { recruiter: 'Sarah Reeves', company: 'TechCorp', rating: 4.2, decision: 'Proceed to Final Round' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: 'ib-9', user_id: 'demo', category: 'seat_purchase', type: 'seat_purchase',
    title: '🔔 Auto-Renewal Reminder',
    message: 'Your institution subscription auto-renews in 7 days on Oct 1, 2026. Amount: ₹29,900 for 100 seats. Ensure sufficient balance.',
    is_read: true, action_url: '/institution-subscription', action_label: 'Manage Subscription',
    metadata: { renewal_date: '2026-10-01', amount: 29900, seats: 100 },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function groupByDate(messages: InboxMessage[]): { label: string; items: InboxMessage[] }[] {
  const groups: Record<string, InboxMessage[]> = {};
  const now = new Date();
  messages.forEach(m => {
    const d = new Date(m.created_at);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    let label: string;
    if (diffDays === 0) label = 'Today';
    else if (diffDays === 1) label = 'Yesterday';
    else if (diffDays < 7) label = 'This Week';
    else if (diffDays < 30) label = 'This Month';
    else label = 'Older';
    if (!groups[label]) groups[label] = [];
    groups[label].push(m);
  });
  const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
  return order.filter(l => groups[l]).map(l => ({ label: l, items: groups[l] }));
}

const FILTER_TABS: { key: InboxCategory | 'all' | 'unread'; label: string; icon?: React.ReactNode }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'interview_reminder', label: 'Reminders', icon: <CalendarCheck size={12} /> },
  { key: 'score_notification', label: 'Scores', icon: <BarChart2 size={12} /> },
  { key: 'feedback_decision', label: 'Feedback', icon: <MessageSquare size={12} /> },
  { key: 'seat_purchase', label: 'Purchases', icon: <CreditCard size={12} /> },
];

// ─── Message Row ──────────────────────────────────────────────────────────────
function MessageRow({
  message,
  onRead,
  onAction,
}: {
  message: InboxMessage;
  onRead: (id: string) => void;
  onAction: (url: string) => void;
}) {
  const cfg = categoryConfig[message.type] || categoryConfig[message.category] || categoryConfig.system;

  return (
    <div
      className={`group flex items-start gap-4 px-5 py-4 border-b border-border last:border-0 transition-colors hover:bg-muted/30 cursor-pointer ${!message.is_read ? 'bg-primary/[0.03]' : ''}`}
      onClick={() => { if (!message.is_read) onRead(message.id); }}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconBg}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-700 uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
              {!message.is_read && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
              )}
            </div>
            <p className={`text-[13.5px] leading-snug ${message.is_read ? 'text-muted-foreground font-400' : 'text-foreground font-600'}`}>
              {message.title}
            </p>
            <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
              {message.message}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">{timeAgo(message.created_at)}</span>
            {!message.is_read && (
              <button
                onClick={(e) => { e.stopPropagation(); onRead(message.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Mark as read"
              >
                <CheckCircle2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Action link */}
        {message.action_url && message.action_label && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(message.action_url!); }}
            className={`mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-600 ${cfg.color} hover:opacity-80 transition-opacity`}
          >
            {message.action_label}
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InboxContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InboxCategory | 'all' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const channelRef = useRef<any>(null);

  const loadMessages = useCallback(async () => {
    if (!user) {
      if (isDemoMode()) {
        setMessages(MOCK_INBOX);
        setUseMock(true);
      } else {
        setMessages([]);
        setUseMock(false);
      }
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Inbox load:', error.message);
      setMessages([]);
      setUseMock(false);
      setLoading(false);
      return;
    }

    const mapped: InboxMessage[] = (data || []).map((n: {
      id: string;
      user_id: string;
      type: string;
      title: string;
      message: string;
      is_read: boolean;
      action_url: string | null;
      metadata?: Record<string, unknown>;
      created_at: string;
    }) => ({
      id: n.id,
      user_id: n.user_id,
      category: mapTypeToCategory(n.type),
      type: n.type,
      title: n.title,
      message: n.message,
      is_read: n.is_read,
      action_url: n.action_url,
      action_label: getActionLabel(n.type),
      metadata: n.metadata || {},
      created_at: n.created_at,
    }));
    setMessages(mapped);
    setUseMock(false);
    setLoading(false);
  }, [user]);

  function mapTypeToCategory(type: string): InboxCategory {
    if (['interview_scheduled', 'interview_reminder', 'booking_confirmed', 'interview_completed'].includes(type)) return 'interview_reminder';
    if (['score_ready', 'assessment_assigned'].includes(type)) return 'score_notification';
    if (['shortlisted', 'offer_accepted', 'offer_received', 'offer_declined', 'task_due'].includes(type)) return 'feedback_decision';
    if (type === 'seat_purchase') return 'seat_purchase';
    return 'system';
  }

  function getActionLabel(type: string): string {
    const map: Record<string, string> = {
      interview_scheduled: 'View Invitations',
      interview_reminder: 'View Invitations',
      booking_confirmed: 'View Invitations',
      interview_completed: 'View Results',
      score_ready: 'View Full Report',
      assessment_assigned: 'Start Assessment',
      shortlisted: 'View Job Details',
      offer_accepted: 'View Offer',
      offer_received: 'Review Offer',
      offer_declined: 'View Details',
      task_due: 'Open Task',
      seat_purchase: 'View Subscription',
      system: 'View Details',
    };
    return map[type] || 'View Details';
  }

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id || useMock) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-${user.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as any;
        const newMsg: InboxMessage = {
          id: n.id,
          user_id: n.user_id,
          category: mapTypeToCategory(n.type),
          type: n.type,
          title: n.title,
          message: n.message,
          is_read: n.is_read,
          action_url: n.action_url,
          action_label: getActionLabel(n.type),
          metadata: n.metadata || {},
          created_at: n.created_at,
        };
        setMessages(prev => [newMsg, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as any;
        setMessages(prev => prev.map(m => m.id === n.id ? { ...m, is_read: n.is_read } : m));
      })
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [user?.id, useMock]);

  const handleMarkRead = async (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    if (!useMock && user) {
      const supabase = createClient();
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
    if (!useMock && user) {
      const supabase = createClient();
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    }
    setMarkingAll(false);
  };

  const handleAction = (url: string) => {
    router.push(url);
  };

  // Filter
  const filtered = messages.filter(m => {
    const matchFilter =
      filter === 'all' ? true :
      filter === 'unread' ? !m.is_read :
      m.category === filter;
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.message.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const grouped = groupByDate(filtered);
  const unreadCount = messages.filter(m => !m.is_read).length;

  const categoryCounts: Record<string, number> = {};
  messages.forEach(m => {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + (m.is_read ? 0 : 1);
  });

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5 fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Inbox size={20} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-800 text-foreground">Inbox</h1>
                {unreadCount > 0 && (
                  <span className="bg-danger text-white text-[11px] font-700 rounded-full px-2 py-0.5 min-w-[22px] text-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Interview reminders, scores, feedback decisions & purchase confirmations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Realtime indicator */}
            <div className={`flex items-center gap-1.5 text-[11px] font-500 px-2.5 py-1 rounded-full border ${realtimeConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
              {realtimeConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {realtimeConnected ? 'Live' : 'Offline'}
            </div>
            <button
              onClick={loadMessages}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: messages.length, icon: <Inbox size={14} />, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Unread', value: unreadCount, icon: <Circle size={14} />, color: 'text-danger', bg: 'bg-danger/10' },
            { label: 'Reminders', value: messages.filter(m => m.category === 'interview_reminder').length, icon: <CalendarCheck size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Scores', value: messages.filter(m => m.category === 'score_notification').length, icon: <BarChart2 size={14} />, color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <div>
                <p className="text-lg font-800 text-foreground leading-none">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Search + Mark all */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search messages…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 text-xs font-600 text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-muted whitespace-nowrap"
              >
                {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto scrollbar-none">
            {FILTER_TABS.map(tab => {
              const count = tab.key === 'all' ? messages.length :
                tab.key === 'unread' ? unreadCount :
                messages.filter(m => m.category === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 whitespace-nowrap transition-all ${filter === tab.key ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  {tab.icon}
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-700 rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Messages */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox size={32} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-600 text-muted-foreground">No messages found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {filter !== 'all' ? 'Try switching to "All" to see everything' : 'Your inbox is empty'}
              </p>
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.label}>
                <div className="px-5 py-2 bg-muted/30 border-b border-border">
                  <span className="text-[11px] font-700 text-muted-foreground uppercase tracking-wide">{group.label}</span>
                </div>
                {group.items.map(msg => (
                  <MessageRow
                    key={msg.id}
                    message={msg}
                    onRead={handleMarkRead}
                    onAction={handleAction}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {useMock && (
          <p className="text-center text-[11px] text-muted-foreground/50">
            Demo preview — sign in to see your live notifications
          </p>
        )}
      </div>
    </AppLayout>
  );
}
