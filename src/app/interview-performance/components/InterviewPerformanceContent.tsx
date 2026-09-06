'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TrendingUp, MessageSquare, ChevronDown, ChevronUp, Sparkles, ShieldCheck, BookOpen, Target, Clock, BarChart2, Download, ArrowLeft, Loader2, AlertCircle, CheckCircle, Star, Zap, FileText, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CategoryScore {
  name: string;
  score: number;
  weight: number;
  feedback: string;
  level: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement';
}

interface TranscriptEntry {
  timestamp: string;
  speaker: 'candidate' | 'ai';
  text: string;
  questionNumber?: number;
}

interface AnswerDetail {
  questionNumber: number;
  question: string;
  answer: string;
  score: number;
  strengths: string[];
  improvements: string[];
  idealAnswer: string;
}

interface PerformanceData {
  interviewId: string;
  role: string;
  company: string;
  completedAt: string;
  durationMinutes: number;
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  confidenceScore: number;
  clarityScore: number;
  categories: CategoryScore[];
  strengths: string[];
  improvementAreas: string[];
  aiDebrief: string;
  transcript: TranscriptEntry[];
  answerDetails: AnswerDetail[];
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  questionsAnswered: number;
  totalQuestions: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const scoreColor = (s: number) =>
  s >= 85 ? 'text-emerald-400' : s >= 70 ? 'text-blue-400' : s >= 55 ? 'text-amber-400' : 'text-red-400';

const scoreBg = (s: number) =>
  s >= 85 ? 'bg-emerald-400' : s >= 70 ? 'bg-blue-400' : s >= 55 ? 'bg-amber-400' : 'bg-red-400';

const scoreBorder = (s: number) =>
  s >= 85 ? 'border-emerald-400/30' : s >= 70 ? 'border-blue-400/30' : s >= 55 ? 'border-amber-400/30' : 'border-red-400/30';

const levelBadge: Record<string, string> = {
  'Excellent': 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25',
  'Good': 'bg-blue-400/15 text-blue-400 border-blue-400/25',
  'Satisfactory': 'bg-amber-400/15 text-amber-400 border-amber-400/25',
  'Needs Improvement': 'bg-red-400/15 text-red-400 border-red-400/25',
};

const recConfig: Record<string, { label: string; color: string; bg: string }> = {
  strong_yes: { label: 'Strong Hire', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/25' },
  yes: { label: 'Hire', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/25' },
  maybe: { label: 'Consider', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/25' },
  no: { label: 'Not Recommended', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/25' },
};

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 88, label }: { score: number; size?: number; label: string }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? '#34d399' : score >= 70 ? '#60a5fa' : score >= 55 ? '#fbbf24' : '#f87171';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-800 tabular-nums ${scoreColor(score)}`}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center leading-tight max-w-[80px]">{label}</span>
    </div>
  );
}

// ─── Category Bar ─────────────────────────────────────────────────────────────
function CategoryBar({ cat }: { cat: CategoryScore }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-500 text-foreground">{cat.name}</span>
          <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-600 ${levelBadge[cat.level]}`}>{cat.level}</span>
        </div>
        <span className={`font-700 tabular-nums ${scoreColor(cat.score)}`}>{cat.score}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${scoreBg(cat.score)}`} style={{ width: `${cat.score}%` }} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{cat.feedback}</p>
    </div>
  );
}

// ─── Transcript Entry ─────────────────────────────────────────────────────────
function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
  return (
    <div className={`flex gap-3 ${entry.speaker === 'ai' ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-700 ${
        entry.speaker === 'ai' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
      }`}>
        {entry.speaker === 'ai' ? 'AI' : 'You'}
      </div>
      <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
        entry.speaker === 'ai' ?'bg-primary/5 border border-primary/15 text-foreground' :'bg-card border border-border text-foreground'
      }`}>
        {entry.questionNumber && (
          <span className="text-[10px] font-600 text-muted-foreground block mb-1">Q{entry.questionNumber}</span>
        )}
        <p className="text-sm leading-relaxed">{entry.text}</p>
        <span className="text-[10px] text-muted-foreground/60 mt-1 block">{entry.timestamp}</span>
      </div>
    </div>
  );
}

// ─── Answer Accordion ─────────────────────────────────────────────────────────
function AnswerAccordion({ detail }: { detail: AnswerDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all ${scoreBorder(detail.score)}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-800 shrink-0 text-white ${scoreBg(detail.score)}`}>
          {detail.questionNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-500 text-foreground truncate">{detail.question}</p>
          <span className={`text-xs font-700 tabular-nums ${scoreColor(detail.score)}`}>{detail.score}/100</span>
        </div>
        {open ? <ChevronUp size={15} className="text-muted-foreground shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/50">
          <div className="pt-4">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Your Answer</p>
            <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">{detail.answer || 'No answer recorded.'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-600 text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ThumbsUp size={11} /> Strengths
              </p>
              <ul className="space-y-1.5">
                {detail.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <CheckCircle size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-600 text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ThumbsDown size={11} /> Improvements
              </p>
              <ul className="space-y-1.5">
                {detail.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <AlertCircle size={11} className="text-amber-400 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {detail.idealAnswer && (
            <div>
              <p className="text-xs font-600 text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Star size={11} /> Ideal Answer
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed bg-blue-400/5 border border-blue-400/15 rounded-lg p-3">{detail.idealAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mock Data Builder ────────────────────────────────────────────────────────
function buildMockData(interviewId: string): PerformanceData {
  return {
    interviewId,
    role: 'Software Engineer',
    company: 'Meridian Technologies',
    completedAt: new Date(Date.now() - 3600000).toISOString(),
    durationMinutes: 42,
    overallScore: 78,
    communicationScore: 82,
    technicalScore: 74,
    confidenceScore: 80,
    clarityScore: 76,
    recommendation: 'yes',
    questionsAnswered: 8,
    totalQuestions: 10,
    categories: [
      { name: 'Technical Knowledge', score: 74, weight: 30, feedback: 'Solid understanding of core concepts. Deepen knowledge of system design patterns.', level: 'Good' },
      { name: 'Communication', score: 82, weight: 25, feedback: 'Clear and articulate. Excellent use of structured responses.', level: 'Good' },
      { name: 'Problem Solving', score: 71, weight: 25, feedback: 'Good analytical approach. Practice breaking down complex problems step-by-step.', level: 'Good' },
      { name: 'Confidence & Presence', score: 80, weight: 10, feedback: 'Maintained composure throughout. Slight hesitation on edge-case questions.', level: 'Good' },
      { name: 'Clarity & Conciseness', score: 76, weight: 10, feedback: 'Responses were mostly concise. Avoid over-explaining simple concepts.', level: 'Good' },
    ],
    strengths: [
      'Strong grasp of data structures and algorithms',
      'Excellent communication and structured responses',
      'Demonstrated real-world project experience effectively',
      'Maintained composure under pressure',
    ],
    improvementAreas: [
      'Deepen system design knowledge (distributed systems, CAP theorem)',
      'Practice concise answers for behavioral questions',
      'Improve time complexity analysis explanations',
      'Work on edge-case handling in coding problems',
    ],
    aiDebrief: `Overall, you delivered a strong performance with a score of 78/100. Your communication skills stood out — you structured your answers clearly using the STAR method and maintained excellent eye contact throughout.

Your technical foundation is solid, particularly in data structures and algorithms. However, there's room to grow in system design. When asked about designing a distributed cache, your answer covered the basics but missed discussing consistency models and partition tolerance trade-offs. For behavioral questions, you provided relevant examples but occasionally over-explained. Practice the "headline first" technique — lead with your conclusion, then provide supporting details. **Key Recommendation**: Focus your next 2 weeks on system design patterns (read"Designing Data-Intensive Applications") and practice 3-4 mock behavioral interviews focusing on conciseness. You're close to the "Strong Hire" threshold — a few targeted improvements will get you there.`,
    transcript: [
      { timestamp: '00:01', speaker: 'ai', text: 'Welcome! Let\'s start with a brief introduction. Tell me about yourself and your background.', questionNumber: 1 },
      { timestamp: '00:45', speaker: 'candidate', text: 'I\'m a software engineer with 3 years of experience, primarily working with React and Node.js. I\'ve built scalable web applications at my current company and have a strong interest in distributed systems.' },
      { timestamp: '02:30', speaker: 'ai', text: 'Great background! Can you walk me through a challenging technical problem you solved recently?', questionNumber: 2 },
      { timestamp: '03:15', speaker: 'candidate', text: 'Sure. We had a performance bottleneck in our API — response times were spiking under load. I profiled the application, identified N+1 query issues, and implemented DataLoader for batching. This reduced response times by 60%.' },
      { timestamp: '06:00', speaker: 'ai', text: 'Excellent approach. Now let\'s discuss system design. How would you design a URL shortening service?', questionNumber: 3 },
      { timestamp: '06:45', speaker: 'candidate', text: 'I\'d use a hash function to generate short codes, store mappings in a database with a cache layer like Redis for hot URLs. For scale, I\'d use consistent hashing across multiple database shards.' },
    ],
    answerDetails: [
      {
        questionNumber: 1,
        question: 'Tell me about yourself and your background.',
        answer: 'I\'m a software engineer with 3 years of experience, primarily working with React and Node.js. I\'ve built scalable web applications and have a strong interest in distributed systems.',
        score: 82,
        strengths: ['Clear and concise introduction', 'Highlighted relevant experience', 'Showed genuine interest in the field'],
        improvements: ['Could mention specific achievements with metrics', 'Add a brief mention of career goals'],
        idealAnswer: 'A strong introduction covers: current role, years of experience, key technical skills, a notable achievement with impact, and alignment with the role being applied for.',
      },
      {
        questionNumber: 2,
        question: 'Walk me through a challenging technical problem you solved recently.',
        answer: 'We had a performance bottleneck in our API. I profiled the application, identified N+1 query issues, and implemented DataLoader for batching. This reduced response times by 60%.',
        score: 88,
        strengths: ['Used STAR method effectively', 'Quantified the impact (60% improvement)', 'Demonstrated debugging methodology'],
        improvements: ['Could elaborate on the investigation process', 'Mention team collaboration aspect'],
        idealAnswer: 'Describe the problem context, your diagnostic approach, the solution implemented, and measurable outcomes. Include what you learned from the experience.',
      },
      {
        questionNumber: 3,
        question: 'How would you design a URL shortening service?',
        answer: 'I\'d use a hash function to generate short codes, store mappings in a database with a Redis cache layer. For scale, I\'d use consistent hashing across multiple database shards.',
        score: 71,
        strengths: ['Mentioned caching strategy', 'Considered scalability with sharding'],
        improvements: ['Missed discussing consistency vs availability trade-offs', 'Should address collision handling', 'No mention of analytics or rate limiting'],
        idealAnswer: 'Cover: hash generation with collision handling, storage (SQL vs NoSQL trade-offs), caching hot URLs, read/write scaling strategies, analytics tracking, and rate limiting for abuse prevention.',
      },
    ],
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
type ActiveTab = 'overview' | 'categories' | 'debrief' | 'transcript' | 'answers';

export default function InterviewPerformanceContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewId = searchParams.get('id') || 'demo-interview';

  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: result } = await supabase
        .from('interview_results')
        .select('*, interviews(*)')
        .eq('interview_id', interviewId)
        .maybeSingle();

      if (result) {
        const interview = (result as any).interviews;
        const scores = (result as any).scores || {};
        setData({
          interviewId,
          role: interview?.role || 'Software Engineer',
          company: interview?.company || 'Meridian Technologies',
          completedAt: result.created_at,
          durationMinutes: interview?.duration_minutes || 40,
          overallScore: result.overall_score || 75,
          communicationScore: scores.communication || 80,
          technicalScore: scores.technical || 72,
          confidenceScore: scores.confidence || 78,
          clarityScore: scores.clarity || 74,
          recommendation: result.recommendation || 'yes',
          questionsAnswered: result.questions_answered || 8,
          totalQuestions: result.total_questions || 10,
          categories: scores.categories || buildMockData(interviewId).categories,
          strengths: result.strengths || buildMockData(interviewId).strengths,
          improvementAreas: result.improvement_areas || buildMockData(interviewId).improvementAreas,
          aiDebrief: result.ai_feedback || buildMockData(interviewId).aiDebrief,
          transcript: result.transcript || buildMockData(interviewId).transcript,
          answerDetails: result.answer_details || buildMockData(interviewId).answerDetails,
        });
      } else {
        setData(buildMockData(interviewId));
      }
    } catch {
      setData(buildMockData(interviewId));
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => { fetchPerformance(); }, [fetchPerformance]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your performance report…</p>
      </div>
    );
  }

  if (!data) return null;

  const rec = recConfig[data.recommendation];
  const completedDate = new Date(data.completedAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
    { id: 'categories', label: 'Category Scores', icon: <Target size={14} /> },
    { id: 'debrief', label: 'AI Debrief', icon: <Sparkles size={14} /> },
    { id: 'transcript', label: 'Transcript', icon: <MessageSquare size={14} /> },
    { id: 'answers', label: 'Answer Review', icon: <FileText size={14} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-2xl font-700 text-foreground">Interview Performance Report</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.role} · {data.company} · {completedDate}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-500 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all shrink-0">
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* Score Hero */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Overall Ring */}
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={data.overallScore} size={110} label="Overall Score" />
            <div className={`px-3 py-1 rounded-full border text-xs font-600 ${rec.bg} ${rec.color}`}>
              {rec.label}
            </div>
          </div>

          {/* Sub-scores */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            <ScoreRing score={data.communicationScore} size={72} label="Communication" />
            <ScoreRing score={data.technicalScore} size={72} label="Technical" />
            <ScoreRing score={data.confidenceScore} size={72} label="Confidence" />
            <ScoreRing score={data.clarityScore} size={72} label="Clarity" />
          </div>

          {/* Meta */}
          <div className="flex flex-col gap-3 shrink-0 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock size={14} className="text-primary" />
              <span>{data.durationMinutes} min</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare size={14} className="text-primary" />
              <span>{data.questionsAnswered}/{data.totalQuestions} answered</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap size={14} className="text-primary" />
              <span>{Math.round((data.questionsAnswered / data.totalQuestions) * 100)}% completion</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-emerald-400/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
                  <ShieldCheck size={14} className="text-emerald-400" />
                </div>
                <h3 className="text-sm font-600 text-foreground">Key Strengths</h3>
                <span className="ml-auto text-xs bg-emerald-400/15 text-emerald-400 rounded-full px-2 py-0.5 font-600">{data.strengths.length}</span>
              </div>
              <ul className="space-y-2.5">
                {data.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-amber-400/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-400/15 flex items-center justify-center">
                  <BookOpen size={14} className="text-amber-400" />
                </div>
                <h3 className="text-sm font-600 text-foreground">Improvement Areas</h3>
                <span className="ml-auto text-xs bg-amber-400/15 text-amber-400 rounded-full px-2 py-0.5 font-600">{data.improvementAreas.length}</span>
              </div>
              <ul className="space-y-2.5">
                {data.improvementAreas.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <TrendingUp size={13} className="text-amber-400 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick category preview */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-600 text-foreground flex items-center gap-2">
                <Target size={15} className="text-primary" /> Category Breakdown
              </h3>
              <button onClick={() => setActiveTab('categories')} className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-4">
              {data.categories.slice(0, 3).map(cat => (
                <CategoryBar key={cat.name} cat={cat} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-600 text-foreground flex items-center gap-2">
            <Target size={15} className="text-primary" /> All Category Scores
          </h3>
          {data.categories.map(cat => (
            <CategoryBar key={cat.name} cat={cat} />
          ))}
        </div>
      )}

      {activeTab === 'debrief' && (
        <div className="bg-card border border-primary/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles size={15} className="text-primary" />
            </div>
            <h3 className="text-sm font-600 text-foreground">AI-Generated Debrief</h3>
            <span className="ml-auto text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 border border-primary/20 font-500">AI Analysis</span>
          </div>
          <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
            {data.aiDebrief.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed mb-3 last:mb-0"
                dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'transcript' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-600 text-foreground flex items-center gap-2">
              <MessageSquare size={15} className="text-primary" /> Interview Transcript
            </h3>
            <span className="text-xs text-muted-foreground">{data.transcript.length} exchanges</span>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {(transcriptExpanded ? data.transcript : data.transcript.slice(0, 6)).map((entry, i) => (
              <TranscriptLine key={i} entry={entry} />
            ))}
          </div>
          {data.transcript.length > 6 && (
            <button
              onClick={() => setTranscriptExpanded(e => !e)}
              className="w-full py-2 text-xs text-primary hover:underline flex items-center justify-center gap-1"
            >
              {transcriptExpanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {data.transcript.length} exchanges</>}
            </button>
          )}
        </div>
      )}

      {activeTab === 'answers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-600 text-foreground flex items-center gap-2">
              <FileText size={15} className="text-primary" /> Answer-by-Answer Review
            </h3>
            <span className="text-xs text-muted-foreground">{data.answerDetails.length} questions</span>
          </div>
          {data.answerDetails.map(detail => (
            <AnswerAccordion key={detail.questionNumber} detail={detail} />
          ))}
        </div>
      )}
    </div>
  );
}
