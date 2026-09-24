'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Briefcase, ChevronRight, Mic, CheckCircle2, AlertCircle, Loader2, BarChart2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UpcomingInterview {
  id: string;
  role: string;
  company: string;
  scheduledAt: string;
  duration: number;
  interviewType: string;
  skills: string[];
}

interface PerformanceScore {
  score: number;
  role: string;
  completedAt: string;
}

const DEFAULT_CHECKLIST = [
  { id: 'c1', label: 'Test microphone', completed: false },
  { id: 'c2', label: 'Review job description', completed: false },
  { id: 'c3', label: 'Prepare STAR stories', completed: false },
  { id: 'c4', label: 'Check internet connection', completed: false },
];

export default function UpcomingInterviewCard() {
  const { user } = useAuth();
  const [interview, setInterview] = useState<UpcomingInterview | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [latestScore, setLatestScore] = useState<PerformanceScore | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const supabase = createClient();

    const fetchData = async () => {
      try {
        // Fetch upcoming interview
        const { data: interviewData } = await supabase
          .from('interviews')
          .select('id, role, company, scheduled_at, duration_minutes, interview_type')
          .eq('status', 'scheduled')
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .single();

        if (interviewData) {
          setInterview({
            id: interviewData.id,
            role: interviewData.role || 'Software Engineer',
            company: interviewData.company || '',
            scheduledAt: interviewData.scheduled_at,
            duration: interviewData.duration_minutes || 45,
            interviewType: interviewData.interview_type || 'Technical',
            skills: ['React', 'TypeScript', 'System Design'],
          });
        }

        // Fetch latest score
        const { data: scoreData } = await supabase
          .from('interviews')
          .select('id, role, overall_score, completed_at')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .not('overall_score', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();

        if (scoreData?.overall_score) {
          setLatestScore({
            score: scoreData.overall_score,
            role: scoreData.role || 'Interview',
            completedAt: scoreData.completed_at,
          });
        }
      } catch {
        // No data
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription for interview updates and score updates
    const supabaseClient = createClient();
    const channel = supabaseClient
      .channel(`upcoming-interview-${user.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interviews',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        // Refresh on any interview change (new booking, score update, etc.)
        fetchData();
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user]);

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, completed: !c.completed } : c));
  };

  const completedPrep = checklist.filter(c => c.completed).length;
  const prepPct = Math.round((completedPrep / checklist.length) * 100);

  if (loading) {
    return (
      <div className="rounded-lg border border-primary/30 bg-card p-5 flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-card p-5 text-center fade-in">
          <Briefcase size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming interviews scheduled</p>
          <Link href="/book-interview" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-600 rounded-lg hover:bg-primary/90 transition-colors">
            <Calendar size={14} /> Book Interview
          </Link>
        </div>
        {latestScore && (
          <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3 fade-in">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart2 size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Latest Score</p>
              <p className="text-sm font-700 text-foreground">{latestScore.role}</p>
            </div>
            <div className="text-right">
              <p className={`text-xl font-800 ${latestScore.score >= 80 ? 'text-success' : latestScore.score >= 60 ? 'text-primary' : 'text-warning'}`}>
                {latestScore.score}
              </p>
              <p className="text-[10px] text-muted-foreground">/ 100</p>
            </div>
            <Link href="/interview-results" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </div>
    );
  }

  const scheduledDate = new Date(interview.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-lg border border-primary/30 bg-card overflow-hidden fade-in card-hover">
      <div className="bg-primary/5 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <span className="text-[12px] font-600 text-primary uppercase tracking-wide">Upcoming Interview</span>
        </div>
        <span className="text-[12px] text-muted-foreground font-500">{dateStr} at {timeStr}</span>
      </div>

      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-base font-600 text-foreground">{interview.role}</p>
                {interview.company && <p className="text-sm text-muted-foreground">{interview.company}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Clock size={14} /><span>{interview.duration} min</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Mic size={14} /><span>{interview.interviewType} Interview</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {interview.skills.map((skill) => (
                <span key={skill} className="text-[11px] font-500 px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">{skill}</span>
              ))}
            </div>
          </div>

          <div className="sm:w-56 shrink-0">
            <div className="rounded-lg bg-muted/60 border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-600 text-foreground">Preparation</span>
                <span className="tabular-nums text-[12px] font-600 text-primary">{completedPrep}/{checklist.length}</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
                <div className="h-1.5 bg-primary rounded-full score-bar-fill" style={{ width: `${prepPct}%` }} />
              </div>
              <div className="space-y-1.5 mt-2">
                {checklist.map((item) => (
                  <button key={item.id} onClick={() => toggleCheck(item.id)} className="flex items-center gap-2 w-full text-left">
                    {item.completed ? (
                      <CheckCircle2 size={13} className="text-success shrink-0" />
                    ) : (
                      <AlertCircle size={13} className="text-muted-foreground shrink-0" />
                    )}
                    <span className={`text-[12px] truncate ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Link href="/live-interview" className="mt-3 w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-600 rounded-md py-2.5 transition-all duration-150 active:scale-95">
              <Mic size={15} />Enter Interview Room<ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}