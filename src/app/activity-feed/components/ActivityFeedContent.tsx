'use client';
import React, { useState } from 'react';
import { Bell, BookOpen, CheckCircle, Award, Mail, MessageSquare, Search, Clock, Circle, Star, BarChart2, Zap, RefreshCw } from 'lucide-react';

type ActivityType = 'enrollment' | 'completion' | 'achievement' | 'interview_invite' | 'feedback' | 'assessment' | 'offer';
type FilterType = 'all' | 'unread' | 'read';
type SortType = 'newest' | 'oldest';

interface Activity {
  id: number;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  read: boolean;
  meta?: string;
  score?: number;
}

const mockActivities: Activity[] = [
  { id: 1, type: 'interview_invite', title: 'Interview Invitation from Google', description: 'You have been invited for a Senior Frontend Engineer interview at Google. Scheduled for Sep 10, 2026 at 10:00 AM.', timestamp: '2026-09-06T04:30:00', timeAgo: '12 min ago', read: false, meta: 'Google · Senior Frontend Engineer' },
  { id: 2, type: 'feedback', title: 'Interview Feedback Available', description: 'Feedback from your Microsoft Full Stack Developer interview is now available. Overall score: 76%.', timestamp: '2026-09-06T02:00:00', timeAgo: '2h ago', read: false, meta: 'Microsoft · 76% Score', score: 76 },
  { id: 3, type: 'achievement', title: 'Achievement Unlocked: Interview Streak', description: 'Congratulations! You completed 5 mock interviews in a row. Keep up the momentum!', timestamp: '2026-09-05T18:00:00', timeAgo: '10h ago', read: false, meta: '🏆 5-Interview Streak' },
  { id: 4, type: 'completion', title: 'Course Completed: Advanced React Patterns', description: 'You successfully completed the Advanced React Patterns course with a score of 92%. Certificate issued.', timestamp: '2026-09-05T14:00:00', timeAgo: '14h ago', read: false, meta: '92% · Certificate Issued', score: 92 },
  { id: 5, type: 'enrollment', title: 'Enrolled in System Design Masterclass', description: 'You have been enrolled in the System Design Masterclass. Start your first lesson to begin your journey.', timestamp: '2026-09-05T10:00:00', timeAgo: '18h ago', read: true, meta: '12 modules · 8h content' },
  { id: 6, type: 'assessment', title: 'Assessment Result: Data Structures', description: 'Your Data Structures assessment result is ready. You scored 84/100. Review your answers and feedback.', timestamp: '2026-09-04T16:00:00', timeAgo: '1d ago', read: true, meta: '84/100 · Passed', score: 84 },
  { id: 7, type: 'feedback', title: 'Recruiter Feedback on Your Profile', description: 'Sarah Reeves from TechCorp has reviewed your profile and left feedback. Check your recruiter feedback section.', timestamp: '2026-09-04T11:00:00', timeAgo: '1d ago', read: true, meta: 'TechCorp · Profile Review' },
  { id: 8, type: 'achievement', title: 'New Badge: Top Performer', description: 'You ranked in the top 10% of candidates this week on the leaderboard. Badge added to your profile.', timestamp: '2026-09-03T09:00:00', timeAgo: '2d ago', read: true, meta: '🥇 Top 10% This Week' },
  { id: 9, type: 'interview_invite', title: 'Mock Interview Scheduled', description: 'Your mock interview for Amazon SDE role has been confirmed for Sep 8, 2026 at 3:00 PM.', timestamp: '2026-09-03T08:00:00', timeAgo: '2d ago', read: true, meta: 'Amazon · SDE · Sep 8' },
  { id: 10, type: 'completion', title: 'Practice Session Completed: Algorithms', description: 'You completed 15 algorithm problems in today\'s practice session. Best score: 95%.', timestamp: '2026-09-02T20:00:00', timeAgo: '3d ago', read: true, meta: '15 problems · 95% best', score: 95 },
  { id: 11, type: 'enrollment', title: 'Enrolled in Python for Data Science', description: 'Course enrollment confirmed. You can now access all 18 modules of Python for Data Science.', timestamp: '2026-09-01T12:00:00', timeAgo: '4d ago', read: true, meta: '18 modules · Beginner' },
  { id: 12, type: 'offer', title: 'Job Offer Received from Flipkart', description: 'Congratulations! You have received a job offer from Flipkart for the React Developer position. Review and respond.', timestamp: '2026-08-30T10:00:00', timeAgo: '6d ago', read: true, meta: 'Flipkart · React Developer' },
];

const typeConfig: Record<ActivityType, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  enrollment: { icon: <BookOpen size={16} />, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Enrollment' },
  completion: { icon: <CheckCircle size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Completion' },
  achievement: { icon: <Award size={16} />, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Achievement' },
  interview_invite: { icon: <Mail size={16} />, color: 'text-violet-600', bg: 'bg-violet-50', label: 'Interview' },
  feedback: { icon: <MessageSquare size={16} />, color: 'text-[#0D9488]', bg: 'bg-teal-50', label: 'Feedback' },
  assessment: { icon: <BarChart2 size={16} />, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Assessment' },
  offer: { icon: <Star size={16} />, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Job Offer' },
};

export default function ActivityFeedContent() {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');

  const unreadCount = activities.filter(a => !a.read).length;

  const markAllRead = () => setActivities(prev => prev.map(a => ({ ...a, read: true })));
  const markRead = (id: number) => setActivities(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));

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

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
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
        </div>
      </div>

      {/* Activity type summary pills */}
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

      {/* Filters bar */}
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

      {/* Activity list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-10 text-center">
            <Bell size={36} className="text-[#E8ECF4] mx-auto mb-3" />
            <p className="text-sm font-600 text-[#0D1B3E]">No activities found</p>
            <p className="text-xs text-[#6B7A99] mt-1">Try adjusting your filters</p>
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
                  {activity.meta && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] text-[#6B7A99]">{activity.meta}</span>
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
