'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BookOpen, CheckCircle, Award, Mail, MessageSquare, Search, Clock, Circle, Star, BarChart2, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

type ActivityType = 'enrollment' | 'completion' | 'achievement' | 'interview_invite' | 'feedback' | 'assessment' | 'offer';
type FilterType = 'all' | 'unread' | 'read';
type SortType = 'newest' | 'oldest';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  read: boolean;
  meta?: string;
  score?: number;
  actionUrl?: string | null;
}

const typeConfig: Record<ActivityType, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  enrollment: { icon: <BookOpen size={16} />, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Enrollment' },
  completion: { icon: <CheckCircle size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Completion' },
  achievement: { icon: <Award size={16} />, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Achievement' },
  interview_invite: { icon: <Mail size={16} />, color: 'text-violet-600', bg: 'bg-violet-50', label: 'Interview' },
  feedback: { icon: <MessageSquare size={16} />, color: 'text-[#0D9488]', bg: 'bg-teal-50', label: 'Feedback' },
  assessment: { icon: <BarChart2 size={16} />, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Assessment' },
  offer: { icon: <Star size={16} />, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Job Offer' },
};

function mapNotificationType(type: string): ActivityType {
  switch (type) {
    case 'interview_scheduled':
    case 'interview_reminder':
    case 'booking_confirmed':
      return 'interview_invite';
    case 'score_ready':
    case 'interview_completed':
      return 'feedback';
    case 'assessment_assigned':
      return 'assessment';
    case 'offer_received':
    case 'offer_accepted':
    case 'offer_declined':
      return 'offer';
    case 'shortlisted':
    case 'seat_purchase':
      return 'achievement';
    case 'task_due':
      return 'enrollment';
    default:
      return 'completion';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mapNotification(n: {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}): Activity {
  const meta = n.metadata && typeof n.metadata === 'object' ? n.metadata : {};
  const score =
    typeof meta.score === 'number'
      ? meta.score
      : typeof meta.overall_score === 'number'
        ? meta.overall_score
        : undefined;
  const metaLabel =
    typeof meta.label === 'string'
      ? meta.label
      : typeof meta.company === 'string'
        ? String(meta.company) + (meta.role ? ` · ${meta.role}` : '')
        : undefined;

  return {
    id: n.id,
    type: mapNotificationType(n.type),
    title: n.title,
    description: n.message,
    timestamp: n.created_at,
    timeAgo: timeAgo(n.created_at),
    read: Boolean(n.is_read),
    meta: metaLabel,
    score,
    actionUrl: n.action_url,
  };
}

export default function ActivityFeedContent() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications?limit=100');
      if (res.status === 401) {
        setActivities([]);
        setError('Sign in to view your activity feed.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load activity');
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      setActivities(rows.map(mapNotification));
    } catch {
      setActivities([]);
      setError('Could not load activity. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const unreadCount = activities.filter(a => !a.read).length;

  const markAllRead = async () => {
    setActivities(prev => prev.map(a => ({ ...a, read: true })));
    try {
      const res = await fetch('/api/notifications/all', {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      });
      if (!res.ok) {
        await loadFeed();
        setError('Could not mark all as read. Please try again.');
      }
    } catch {
      await loadFeed();
      setError('Could not mark all as read. Please try again.');
    }
  };

  const markRead = async (id: string) => {
    const target = activities.find(a => a.id === id);
    if (!target || target.read) return;
    setActivities(prev => prev.map(a => (a.id === id ? { ...a, read: true } : a)));
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      });
      if (!res.ok) {
        await loadFeed();
        setError('Could not mark as read. Please try again.');
      }
    } catch {
      await loadFeed();
      setError('Could not mark as read. Please try again.');
    }
  };

  const filtered = activities
    .filter(a => {
      if (filter === 'unread') return !a.read;
      if (filter === 'read') return a.read;
      return true;
    })
    .filter(a => typeFilter === 'all' || a.type === typeFilter)
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return sort === 'newest' ? tb - ta : ta - tb;
    });

  const typeCounts: Record<string, number> = {};
  activities.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={24} className="animate-spin text-[#0D9488]" />
        <p className="text-sm text-[#6B7A99]">Loading activity…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Bell size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Activity Feed</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">All your platform activity in one place</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Circle size={10} className="text-violet-500 fill-violet-500" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E]">{unreadCount}</p>
              <p className="text-[10px] text-[#6B7A99]">Unread</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Zap size={15} className="text-amber-500" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E]">{activities.length}</p>
              <p className="text-[10px] text-[#6B7A99]">Total Events</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 text-[#0D9488] border border-[#0D9488]/30 rounded-lg hover:bg-teal-50 transition-colors">
              <CheckCircle size={14} /> Mark All Read
            </button>
          )}
          <button onClick={loadFeed} className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border transition-all ${typeFilter === 'all' ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]' : 'bg-white text-[#6B7A99] border-[#E8ECF4] hover:border-[#0D1B3E] hover:text-[#0D1B3E]'}`}>
          All <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{activities.length}</span>
        </button>
        {(Object.keys(typeConfig) as ActivityType[]).map((type) => {
          const cfg = typeConfig[type];
          const count = typeCounts[type] || 0;
          if (!count) return null;
          return (
            <button key={type} onClick={() => setTypeFilter(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border transition-all ${typeFilter === type ? `${cfg.bg} ${cfg.color} border-current` : 'bg-white text-[#6B7A99] border-[#E8ECF4] hover:text-[#0D1B3E]'}`}>
              {cfg.label} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search activities..." className="w-full pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]" />
        </div>
        <div className="flex items-center gap-1 bg-[#F4F6FA] rounded-lg p-1">
          {(['all', 'unread', 'read'] as FilterType[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-600 rounded-md transition-all ${filter === f ? 'bg-white text-[#0D9488] shadow-sm' : 'text-[#6B7A99] hover:text-[#0D1B3E]'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'unread' && unreadCount > 0 && <span className="ml-1 bg-violet-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-[#6B7A99]" />
          <select value={sort} onChange={(e) => setSort(e.target.value as SortType)}
            className="text-xs font-600 text-[#6B7A99] bg-white border border-[#E8ECF4] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
        <button onClick={() => { setSearch(''); setFilter('all'); setTypeFilter('all'); setSort('newest'); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] bg-white transition-colors">
          <RefreshCw size={12} /> Reset
        </button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-10 text-center">
            <Bell size={36} className="text-[#E8ECF4] mx-auto mb-3" />
            <p className="text-sm font-600 text-[#0D1B3E]">
              {activities.length === 0 ? 'No activity yet' : 'No activities found'}
            </p>
            <p className="text-xs text-[#6B7A99] mt-1">
              {activities.length === 0
                ? 'Notifications from interviews, assessments, and offers will show up here.'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          filtered.map((activity) => {
            const cfg = typeConfig[activity.type];
            return (
              <div
                key={activity.id}
                onClick={() => markRead(activity.id)}
                className={`bg-white border rounded-xl p-4 flex items-start gap-4 cursor-pointer transition-all hover:shadow-sm ${!activity.read ? 'border-violet-200 bg-violet-50/30' : 'border-[#E8ECF4]'}`}
              >
                <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-700 ${!activity.read ? 'text-[#0D1B3E]' : 'text-[#374151]'}`}>{activity.title}</p>
                      {!activity.read && <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {activity.score !== undefined && (
                        <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${activity.score >= 85 ? 'bg-emerald-50 text-emerald-700' : activity.score >= 70 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                          {activity.score}%
                        </span>
                      )}
                      <span className="text-xs text-[#6B7A99] whitespace-nowrap flex items-center gap-1">
                        <Clock size={10} />{activity.timeAgo}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#6B7A99] mt-1 leading-relaxed">{activity.description}</p>
                  {(activity.meta || cfg) && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      {activity.meta && <span className="text-[10px] text-[#6B7A99]">{activity.meta}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-[#6B7A99]">Showing {filtered.length} of {activities.length} activities</p>
      )}
    </div>
  );
}
