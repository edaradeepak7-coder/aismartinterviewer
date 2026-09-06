'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Star, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, BarChart2, Calendar, Search, Award, Brain, Mic, Target, ArrowUp, ArrowDown, Minus, Sparkles, Building2, CheckCircle, AlertCircle, Lock, Zap, Crown, MessageCircle, BookOpen, Lightbulb, BarChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

type Tab = 'ai-tips' | 'rate' | 'archive' | 'trends';

interface AnswerFeedback {
  questionId: number;
  question: string;
  candidateAnswer: string;
  communication: number;
  clarity: number;
  domainCompetency: number;
  overallScore: number;
  aiTips: {
    communication: string;
    clarity: string;
    domainCompetency: string;
  };
  strengths: string[];
  improvements: string[];
  isPremium: boolean;
}

interface FeedbackEntry {
  id: number;
  company: string;
  role: string;
  date: string;
  interviewer: string;
  overallScore: number;
  userRating: number | null;
  status: 'pending_rating' | 'rated';
  aiSummary: string;
  interviewer_comments: string;
  strengths: string[];
  improvements: string[];
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  behavioralScore: number;
}

const answerFeedbacks: AnswerFeedback[] = [
  {
    questionId: 1,
    question: 'Tell me about a time you led a complex technical project under tight deadlines.',
    candidateAnswer: 'I led the migration of our monolith to microservices at my previous company. We had 3 months to complete it. I coordinated with 5 engineers, set up CI/CD pipelines, and we delivered on time.',
    communication: 72,
    clarity: 68,
    domainCompetency: 80,
    overallScore: 73,
    aiTips: {
      communication: 'Your answer lacked emotional engagement. Use the STAR method more explicitly — describe the Situation, Task, Action, and Result with specific metrics. Saying "we delivered on time" is weak; quantify the impact: "reduced deployment time by 40%".',
      clarity: 'The answer jumped from problem to solution without explaining your decision-making process. Add a sentence on why microservices was the right choice and what trade-offs you considered. Interviewers want to see your reasoning, not just the outcome.',
      domainCompetency: 'Good technical depth on CI/CD and microservices. To score higher, mention specific tools (Kubernetes, Docker, GitHub Actions) and explain how you handled service discovery, inter-service communication, or data consistency challenges.',
    },
    strengths: ['Demonstrated ownership', 'Mentioned team coordination', 'Showed delivery focus'],
    improvements: ['Add quantified outcomes', 'Explain decision rationale', 'Name specific tools used'],
    isPremium: false,
  },
  {
    questionId: 2,
    question: 'How do you approach debugging a production issue with no immediate root cause?',
    candidateAnswer: 'I check logs first, then look at recent deployments. I try to reproduce the issue locally and use monitoring tools.',
    communication: 55,
    clarity: 50,
    domainCompetency: 62,
    overallScore: 56,
    aiTips: {
      communication: 'This answer is too brief and generic. Interviewers expect a structured debugging narrative. Walk them through your mental model: hypothesis formation, isolation, testing, resolution, and post-mortem. Show confidence and systematic thinking.',
      clarity: 'The answer lacks structure. Use a numbered approach: "First I... then I... finally I..." This signals clear thinking under pressure. Mention how you communicate status to stakeholders during an incident — that\'s a key differentiator.',
      domainCompetency: 'Mention specific observability tools: Datadog, Sentry, Grafana, or CloudWatch. Explain distributed tracing concepts (correlation IDs, spans). Discuss how you\'d handle a cascading failure vs. a single-service issue differently.',
    },
    strengths: ['Mentioned log analysis', 'Aware of deployment correlation'],
    improvements: ['Structure the debugging process', 'Name specific observability tools', 'Discuss stakeholder communication'],
    isPremium: true,
  },
  {
    questionId: 3,
    question: 'Explain the CAP theorem and when you would choose consistency over availability.',
    candidateAnswer: 'CAP theorem says you can only have two of Consistency, Availability, and Partition tolerance. For financial systems, I would choose consistency.',
    communication: 78,
    clarity: 74,
    domainCompetency: 70,
    overallScore: 74,
    aiTips: {
      communication: 'Good concise opening. Strengthen by giving a real-world example from your experience. Saying "for financial systems" is correct but generic — describe a specific scenario where you made this trade-off and what the consequences were.',
      clarity: 'The explanation is accurate but shallow. Add the nuance that partition tolerance is non-negotiable in distributed systems, so the real choice is between CP and AP. This shows deeper understanding and impresses senior interviewers.',
      domainCompetency: 'Mention specific databases: HBase/Zookeeper (CP), Cassandra/DynamoDB (AP). Discuss eventual consistency patterns, conflict resolution strategies (last-write-wins, vector clocks), and how SAGA patterns handle distributed transactions.',
    },
    strengths: ['Correct definition', 'Practical application awareness', 'Concise delivery'],
    improvements: ['Add real-world example from experience', 'Discuss CP vs AP nuance', 'Name specific database examples'],
    isPremium: true,
  },
  {
    questionId: 4,
    question: 'Describe your experience with React performance optimization.',
    candidateAnswer: 'I use React.memo, useMemo, and useCallback to prevent unnecessary re-renders. I also use code splitting with lazy loading.',
    communication: 82,
    clarity: 85,
    domainCompetency: 88,
    overallScore: 85,
    aiTips: {
      communication: 'Strong answer with good technical vocabulary. To make it exceptional, add a story: "In one project, our dashboard was re-rendering 200+ components on every state change. After profiling with React DevTools, I applied memoization and reduced renders by 85%."',
      clarity: 'Very clear and well-structured. Consider adding the "why" before the "what" — explain the problem you were solving before listing the solutions. This shows problem-first thinking which senior engineers appreciate.',
      domainCompetency: 'Excellent coverage of memoization and code splitting. Add virtualization (react-window/react-virtual) for large lists, bundle analysis (webpack-bundle-analyzer), and Web Vitals optimization (LCP, CLS, FID). Mention Suspense boundaries for streaming.',
    },
    strengths: ['Correct use of memoization hooks', 'Mentioned code splitting', 'Clear technical vocabulary'],
    improvements: ['Add a specific performance story with metrics', 'Mention virtualization for large lists', 'Discuss Web Vitals'],
    isPremium: false,
  },
];

const mockFeedbacks: FeedbackEntry[] = [
  {
    id: 1, company: 'Google', role: 'Senior Frontend Engineer', date: '2026-09-04', interviewer: 'Priya Sharma',
    overallScore: 82, userRating: null, status: 'pending_rating',
    aiSummary: 'Strong technical foundation with React and TypeScript. Demonstrated good problem-solving approach but could improve on system design depth. Communication was clear and structured.',
    interviewer_comments: 'Candidate showed excellent knowledge of React hooks and state management. Needs to work on scalability considerations for large-scale systems. Good cultural fit.',
    strengths: ['React expertise', 'Clean code practices', 'Clear communication'],
    improvements: ['System design depth', 'Scalability thinking', 'Algorithm optimization'],
    technicalScore: 85, communicationScore: 80, problemSolvingScore: 78, behavioralScore: 84,
  },
  {
    id: 2, company: 'Microsoft', role: 'Full Stack Developer', date: '2026-08-28', interviewer: 'Rahul Verma',
    overallScore: 76, userRating: 4, status: 'rated',
    aiSummary: 'Good full-stack knowledge with Node.js and React. The candidate handled behavioral questions well. Technical depth in backend architecture needs improvement.',
    interviewer_comments: 'Solid understanding of REST APIs and database design. Struggled with distributed systems questions. Would benefit from more cloud architecture experience.',
    strengths: ['REST API design', 'Database knowledge', 'Team collaboration'],
    improvements: ['Distributed systems', 'Cloud architecture', 'Performance tuning'],
    technicalScore: 74, communicationScore: 82, problemSolvingScore: 72, behavioralScore: 80,
  },
  {
    id: 3, company: 'Amazon', role: 'Software Development Engineer', date: '2026-08-15', interviewer: 'Ananya Krishnan',
    overallScore: 88, userRating: 5, status: 'rated',
    aiSummary: 'Exceptional performance across all dimensions. Strong algorithmic thinking and leadership principles alignment. One of the top candidates interviewed this quarter.',
    interviewer_comments: 'Outstanding problem-solving skills. Demonstrated strong ownership and customer obsession. Excellent data structures knowledge. Highly recommended.',
    strengths: ['Algorithms & DS', 'Leadership principles', 'Ownership mindset'],
    improvements: ['Minor: more examples for behavioral', 'Slightly verbose explanations'],
    technicalScore: 92, communicationScore: 86, problemSolvingScore: 90, behavioralScore: 88,
  },
];

const trendData = [
  { month: 'May', overall: 65, technical: 62, communication: 68, problemSolving: 60 },
  { month: 'Jun', overall: 70, technical: 68, communication: 72, problemSolving: 66 },
  { month: 'Jul', overall: 70, technical: 68, communication: 72, problemSolving: 65 },
  { month: 'Aug', overall: 76, technical: 74, communication: 82, problemSolving: 72 },
  { month: 'Sep', overall: 82, technical: 85, communication: 80, problemSolving: 78 },
];

const radarData = [
  { subject: 'Technical', current: 85, previous: 68 },
  { subject: 'Communication', current: 80, previous: 72 },
  { subject: 'Problem Solving', current: 78, previous: 65 },
  { subject: 'Behavioral', current: 84, previous: 70 },
  { subject: 'System Design', current: 72, previous: 55 },
];

function StarRating({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} onClick={() => onChange?.(star)} onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)} className="transition-transform hover:scale-110">
          <Star size={22} className={`transition-colors ${(hovered || value || 0) >= star ? 'text-amber-400 fill-amber-400' : 'text-[#E8ECF4]'}`} />
        </button>
      ))}
    </div>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#6B7A99]">{label}</span>
        <span className="text-xs font-700 text-[#0D1B3E]">{score}%</span>
      </div>
      <div className="h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#F4F6FA" strokeWidth="5" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-800 text-[#0D1B3E]">{score}</span>
      </div>
      <span className="text-[10px] font-600 text-[#6B7A99] text-center leading-tight">{label}</span>
    </div>
  );
}

function PremiumTipBlur({ tip, isPremium }: { tip: string; isPremium: boolean }) {
  if (!isPremium) {
    return <p className="text-sm text-[#4B5563] leading-relaxed">{tip}</p>;
  }
  return (
    <div className="relative">
      <p className="text-sm text-[#4B5563] leading-relaxed blur-sm select-none pointer-events-none">{tip}</p>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-1.5 bg-white/90 border border-amber-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Lock size={12} className="text-amber-500" />
          <span className="text-xs font-700 text-amber-700">Starter Plan required</span>
        </div>
      </div>
    </div>
  );
}

export default function InterviewFeedbackContent() {
  const [activeTab, setActiveTab] = useState<Tab>('ai-tips');
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedAnswer, setExpandedAnswer] = useState<number | null>(1);
  const [search, setSearch] = useState('');
  const [ratedFilter, setRatedFilter] = useState<'all' | 'pending' | 'rated'>('all');

  const pendingRating = mockFeedbacks.filter(f => f.status === 'pending_rating');
  const allFeedbacks = mockFeedbacks.filter(f => {
    const matchSearch = f.company.toLowerCase().includes(search.toLowerCase()) || f.role.toLowerCase().includes(search.toLowerCase());
    if (ratedFilter === 'pending') return matchSearch && f.status === 'pending_rating';
    if (ratedFilter === 'rated') return matchSearch && f.status === 'rated';
    return matchSearch;
  });

  const avgScore = Math.round(mockFeedbacks.reduce((s, f) => s + f.overallScore, 0) / mockFeedbacks.length);
  const latestScore = trendData[trendData.length - 1].overall;
  const prevScore = trendData[trendData.length - 2].overall;
  const trend = latestScore - prevScore;

  const TABS = [
    { id: 'ai-tips' as Tab, label: 'AI Improvement Tips', icon: <Sparkles size={14} /> },
    { id: 'rate' as Tab, label: 'Rate Interviews', icon: <Star size={14} /> },
    { id: 'archive' as Tab, label: 'Feedback Archive', icon: <MessageSquare size={14} /> },
    { id: 'trends' as Tab, label: 'Improvement Trends', icon: <TrendingUp size={14} /> },
  ];

  const lockedCount = answerFeedbacks.filter(a => a.isPremium).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Star size={20} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Interview Feedback</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">AI-generated improvement tips, scores, and progress tracking</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <BarChart2 size={15} className="text-[#0D9488]" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E]">{avgScore}%</p>
              <p className="text-[10px] text-[#6B7A99]">Avg Score</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            {trend > 0 ? <ArrowUp size={15} className="text-emerald-500" /> : trend < 0 ? <ArrowDown size={15} className="text-red-500" /> : <Minus size={15} className="text-[#6B7A99]" />}
            <div>
              <p className="text-base font-800 text-[#0D1B3E]">{trend > 0 ? '+' : ''}{trend}%</p>
              <p className="text-[10px] text-[#6B7A99]">vs Last Month</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <AlertCircle size={15} className="text-amber-500" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E]">{pendingRating.length}</p>
              <p className="text-[10px] text-[#6B7A99]">Pending Ratings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={['flex items-center gap-1.5 px-5 py-3 text-sm font-600 border-b-2 transition-all -mb-px whitespace-nowrap',
              activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'].join(' ')}>
            {tab.icon}{tab.label}
            {tab.id === 'ai-tips' && <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-700 rounded-full">NEW</span>}
          </button>
        ))}
      </div>

      {/* ── AI IMPROVEMENT TIPS TAB ── */}
      {activeTab === 'ai-tips' && (
        <div className="space-y-5">
          {/* Upsell Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0D1B3E] via-[#1a3a6e] to-[#0D9488] p-5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0">
                  <Crown size={20} className="text-amber-400" />
                </div>
                <div>
                  <p className="font-800 text-white text-base">{lockedCount} AI tips locked — upgrade to unlock full feedback</p>
                  <p className="text-sm text-white/70 mt-0.5">Starter plan gives you detailed per-answer coaching on Communication, Clarity &amp; Domain Competency for every interview.</p>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {[
                      { icon: <MessageCircle size={13} />, label: 'Communication coaching' },
                      { icon: <BookOpen size={13} />, label: 'Clarity improvement tips' },
                      { icon: <Brain size={13} />, label: 'Domain competency gaps' },
                      { icon: <Lightbulb size={13} />, label: 'Answer rewrite examples' },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-white/80 text-xs">
                        {f.icon}<span>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Link href="/pricing" className="shrink-0 flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-[#0D1B3E] font-700 text-sm px-5 py-2.5 rounded-xl transition-colors shadow-lg">
                <Zap size={15} />
                View Pricing Plans
              </Link>
            </div>
          </div>

          {/* Session context */}
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F4F6FA] flex items-center justify-center">
                <Building2 size={16} className="text-[#0D9488]" />
              </div>
              <div>
                <p className="font-700 text-[#0D1B3E] text-sm">Google — Senior Frontend Engineer</p>
                <p className="text-xs text-[#6B7A99]">Interview on Sep 4, 2026 · Interviewer: Priya Sharma</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ScoreRing score={80} label="Communication" color="#8B5CF6" />
              <ScoreRing score={74} label="Clarity" color="#F59E0B" />
              <ScoreRing score={80} label="Domain" color="#0D9488" />
              <ScoreRing score={78} label="Overall" color="#3B82F6" />
            </div>
          </div>

          {/* Per-answer feedback */}
          <div className="space-y-4">
            {answerFeedbacks.map((af, idx) => (
              <div key={af.questionId} className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
                <button className="w-full p-5 text-left" onClick={() => setExpandedAnswer(expandedAnswer === af.questionId ? null : af.questionId)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F4F6FA] flex items-center justify-center shrink-0 text-xs font-800 text-[#0D9488]">Q{idx + 1}</div>
                      <div>
                        <p className="font-700 text-[#0D1B3E] text-sm leading-snug">{af.question}</p>
                        <p className="text-xs text-[#6B7A99] mt-1 line-clamp-1">{af.candidateAnswer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {af.isPremium && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-700 rounded-full border border-amber-200">
                          <Lock size={9} />PREMIUM
                        </span>
                      )}
                      <span className={`text-base font-800 ${af.overallScore >= 80 ? 'text-emerald-500' : af.overallScore >= 65 ? 'text-amber-500' : 'text-red-500'}`}>{af.overallScore}%</span>
                      {expandedAnswer === af.questionId ? <ChevronUp size={16} className="text-[#6B7A99]" /> : <ChevronDown size={16} className="text-[#6B7A99]" />}
                    </div>
                  </div>
                </button>

                {expandedAnswer === af.questionId && (
                  <div className="px-5 pb-5 border-t border-[#F4F6FA] pt-4 space-y-5">
                    {/* Score rings */}
                    <div className="flex items-center gap-6 flex-wrap">
                      <ScoreRing score={af.communication} label="Communication" color="#8B5CF6" />
                      <ScoreRing score={af.clarity} label="Clarity" color="#F59E0B" />
                      <ScoreRing score={af.domainCompetency} label="Domain Competency" color="#0D9488" />
                      <div className="flex-1 min-w-[200px]">
                        <div className="space-y-2">
                          <ScoreBar label="Communication" score={af.communication} color="bg-violet-400" />
                          <ScoreBar label="Clarity" score={af.clarity} color="bg-amber-400" />
                          <ScoreBar label="Domain Competency" score={af.domainCompetency} color="bg-teal-400" />
                        </div>
                      </div>
                    </div>

                    {/* Candidate answer */}
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E8ECF4]">
                      <p className="text-xs font-700 text-[#6B7A99] mb-1.5 flex items-center gap-1.5"><Mic size={12} />Your Answer</p>
                      <p className="text-sm text-[#0D1B3E] leading-relaxed italic">"{af.candidateAnswer}"</p>
                    </div>

                    {/* AI Tips grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Communication tip */}
                      <div className="p-4 rounded-xl border border-violet-100 bg-violet-50/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                            <MessageCircle size={13} className="text-violet-600" />
                          </div>
                          <div>
                            <p className="text-xs font-800 text-violet-800">Communication</p>
                            <p className="text-[10px] text-violet-600 font-600">{af.communication}/100</p>
                          </div>
                        </div>
                        <PremiumTipBlur tip={af.aiTips.communication} isPremium={af.isPremium} />
                      </div>

                      {/* Clarity tip */}
                      <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                            <BookOpen size={13} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-800 text-amber-800">Clarity</p>
                            <p className="text-[10px] text-amber-600 font-600">{af.clarity}/100</p>
                          </div>
                        </div>
                        <PremiumTipBlur tip={af.aiTips.clarity} isPremium={af.isPremium} />
                      </div>

                      {/* Domain Competency tip */}
                      <div className="p-4 rounded-xl border border-teal-100 bg-teal-50/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                            <Brain size={13} className="text-teal-600" />
                          </div>
                          <div>
                            <p className="text-xs font-800 text-teal-800">Domain Competency</p>
                            <p className="text-[10px] text-teal-600 font-600">{af.domainCompetency}/100</p>
                          </div>
                        </div>
                        <PremiumTipBlur tip={af.aiTips.domainCompetency} isPremium={af.isPremium} />
                      </div>
                    </div>

                    {/* Strengths & improvements */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-700 text-emerald-700 mb-2 flex items-center gap-1"><ThumbsUp size={12} />What worked</p>
                        <div className="space-y-1">
                          {af.strengths.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-xs text-[#0D1B3E]">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-700 text-amber-700 mb-2 flex items-center gap-1"><ThumbsDown size={12} />What to improve</p>
                        <div className="space-y-1">
                          {af.improvements.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              <span className="text-xs text-[#0D1B3E]">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {af.isPremium && (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-3">
                          <Crown size={18} className="text-amber-500" />
                          <div>
                            <p className="text-sm font-700 text-[#0D1B3E]">Unlock full AI coaching for this answer</p>
                            <p className="text-xs text-[#6B7A99]">Get detailed tips, rewrite examples, and model answers with Starter plan</p>
                          </div>
                        </div>
                        <Link href="/pricing" className="shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white font-700 text-xs px-4 py-2 rounded-lg transition-colors">
                          <Zap size={12} />Upgrade
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom upsell */}
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <h3 className="font-800 text-[#0D1B3E] text-base mb-1">What you get with paid plans</h3>
                <p className="text-sm text-[#6B7A99] mb-4">Free plan shows 2 AI tips per session. Paid plans unlock everything.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { plan: 'Starter', price: '₹499/mo', features: ['All AI tips unlocked', 'Communication coaching', 'Clarity improvement', 'Domain gap analysis'], color: 'border-blue-200 bg-blue-50' },
                    { plan: 'Growth', price: '₹999/mo', features: ['Everything in Starter', 'Answer rewrite examples', 'Model answer library', 'Unlimited sessions'], color: 'border-violet-200 bg-violet-50' },
                  ].map((p) => (
                    <div key={p.plan} className={`p-4 rounded-xl border ${p.color}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-800 text-[#0D1B3E]">{p.plan}</p>
                        <p className="text-sm font-700 text-[#0D9488]">{p.price}</p>
                      </div>
                      <div className="space-y-1.5">
                        {p.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                            <span className="text-xs text-[#4B5563]">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 shrink-0">
                <Link href="/pricing" className="flex items-center gap-2 bg-[#0D9488] hover:bg-[#0B8076] text-white font-700 text-sm px-6 py-3 rounded-xl transition-colors shadow-sm">
                  <BarChart size={15} />
                  See All Plans & Pricing
                </Link>
                <p className="text-xs text-[#6B7A99]">No credit card required for free plan</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RATE INTERVIEWS TAB ── */}
      {activeTab === 'rate' && (
        <div className="space-y-4">
          {pendingRating.length === 0 ? (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-10 text-center">
              <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-600 text-[#0D1B3E]">All interviews rated!</p>
              <p className="text-xs text-[#6B7A99] mt-1">Check the Feedback Archive for your history.</p>
            </div>
          ) : (
            pendingRating.map((fb) => (
              <div key={fb.id} className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-[#0D9488]" />
                      </div>
                      <div>
                        <p className="font-700 text-[#0D1B3E]">{fb.company}</p>
                        <p className="text-sm text-[#6B7A99]">{fb.role}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-[#6B7A99] flex items-center gap-1"><Calendar size={11} />{fb.date}</span>
                          <span className="text-xs text-[#6B7A99] flex items-center gap-1"><Mic size={11} />{fb.interviewer}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-600 rounded-full">Pending Rating</span>
                      <span className="text-lg font-800 text-[#0D9488]">{fb.overallScore}%</span>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E8ECF4]">
                    <div className="flex items-start gap-2 mb-2">
                      <Sparkles size={14} className="text-violet-500 mt-0.5 shrink-0" />
                      <p className="text-xs font-700 text-[#0D1B3E]">AI Analysis</p>
                    </div>
                    <p className="text-sm text-[#6B7A99] leading-relaxed">{fb.aiSummary}</p>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-start gap-2 mb-2">
                      <MessageSquare size={14} className="text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs font-700 text-blue-800">Interviewer Comments</p>
                    </div>
                    <p className="text-sm text-blue-700 leading-relaxed">{fb.interviewer_comments}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-700 text-emerald-700 mb-2 flex items-center gap-1"><ThumbsUp size={12} />Strengths</p>
                      <div className="space-y-1">
                        {fb.strengths.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="text-xs text-[#0D1B3E]">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-700 text-amber-700 mb-2 flex items-center gap-1"><ThumbsDown size={12} />Areas to Improve</p>
                      <div className="space-y-1">
                        {fb.improvements.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span className="text-xs text-[#0D1B3E]">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E8ECF4] flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-700 text-[#0D1B3E] mb-1">Rate this interview experience</p>
                      <p className="text-xs text-[#6B7A99]">How well did the interviewer conduct the session?</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <StarRating value={ratings[fb.id] ?? null} onChange={(v) => setRatings(prev => ({ ...prev, [fb.id]: v }))} />
                      {ratings[fb.id] && (
                        <button className="px-4 py-2 bg-[#0D9488] hover:bg-[#0B8076] text-white text-sm font-600 rounded-lg transition-colors">Submit Rating</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── FEEDBACK ARCHIVE TAB ── */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company or role..." className="w-full pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]" />
            </div>
            <div className="flex items-center gap-1 bg-[#F4F6FA] rounded-lg p-1">
              {(['all', 'pending', 'rated'] as const).map((f) => (
                <button key={f} onClick={() => setRatedFilter(f)}
                  className={`px-3 py-1.5 text-xs font-600 rounded-md transition-all ${ratedFilter === f ? 'bg-white text-[#0D9488] shadow-sm' : 'text-[#6B7A99] hover:text-[#0D1B3E]'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {allFeedbacks.map((fb) => (
              <div key={fb.id} className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
                <button className="w-full p-5 text-left" onClick={() => setExpandedId(expandedId === fb.id ? null : fb.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-[#0D9488]" />
                      </div>
                      <div>
                        <p className="font-700 text-[#0D1B3E]">{fb.company} — {fb.role}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-[#6B7A99] flex items-center gap-1"><Calendar size={10} />{fb.date}</span>
                          <span className="text-xs text-[#6B7A99]">{fb.interviewer}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {fb.userRating && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={13} className={i < fb.userRating! ? 'text-amber-400 fill-amber-400' : 'text-[#E8ECF4]'} />
                          ))}
                        </div>
                      )}
                      {fb.status === 'pending_rating' && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-600 rounded-full">Pending</span>}
                      <span className={`text-lg font-800 ${fb.overallScore >= 80 ? 'text-emerald-500' : fb.overallScore >= 70 ? 'text-blue-500' : 'text-amber-500'}`}>{fb.overallScore}%</span>
                      {expandedId === fb.id ? <ChevronUp size={16} className="text-[#6B7A99]" /> : <ChevronDown size={16} className="text-[#6B7A99]" />}
                    </div>
                  </div>
                </button>
                {expandedId === fb.id && (
                  <div className="px-5 pb-5 border-t border-[#F4F6FA] pt-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <ScoreBar label="Technical" score={fb.technicalScore} color="bg-blue-400" />
                      <ScoreBar label="Communication" score={fb.communicationScore} color="bg-violet-400" />
                      <ScoreBar label="Problem Solving" score={fb.problemSolvingScore} color="bg-amber-400" />
                      <ScoreBar label="Behavioral" score={fb.behavioralScore} color="bg-emerald-400" />
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E8ECF4]">
                      <div className="flex items-center gap-2 mb-2"><Sparkles size={13} className="text-violet-500" /><p className="text-xs font-700 text-[#0D1B3E]">AI Summary</p></div>
                      <p className="text-sm text-[#6B7A99]">{fb.aiSummary}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-2 mb-2"><MessageSquare size={13} className="text-blue-600" /><p className="text-xs font-700 text-blue-800">Interviewer Comments</p></div>
                      <p className="text-sm text-blue-700">{fb.interviewer_comments}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── IMPROVEMENT TRENDS TAB ── */}
      {activeTab === 'trends' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-700 text-[#0D1B3E]">Score Progression Over Time</h3>
                <p className="text-xs text-[#6B7A99] mt-0.5">Track how your scores have improved across interviews</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                {[{ label: 'Overall', color: '#0D9488' }, { label: 'Technical', color: '#6366f1' }, { label: 'Communication', color: '#f59e0b' }, { label: 'Problem Solving', color: '#10b981' }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                    <span className="text-[#6B7A99]">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E8ECF4', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="overall" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 4, fill: '#0D9488' }} />
                <Line type="monotone" dataKey="technical" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                <Line type="monotone" dataKey="communication" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
                <Line type="monotone" dataKey="problemSolving" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Competency Comparison</h3>
              <p className="text-xs text-[#6B7A99] mb-4">Current vs. 3 months ago</p>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E8ECF4" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6B7A99' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Current" dataKey="current" stroke="#0D9488" fill="#0D9488" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Previous" dataKey="previous" stroke="#6B7A99" fill="#6B7A99" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E8ECF4', borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4"><Brain size={16} className="text-violet-500" /><h3 className="text-sm font-700 text-[#0D1B3E]">AI Improvement Insights</h3></div>
              <div className="space-y-3">
                {[
                  { area: 'Technical Skills', change: +17, tip: 'React & TypeScript proficiency has improved significantly. Focus next on system design patterns.', icon: <Target size={14} className="text-blue-500" /> },
                  { area: 'Communication', change: +12, tip: 'Clarity and structure in answers has improved. Work on conciseness — aim for 2-minute answers.', icon: <Mic size={14} className="text-violet-500" /> },
                  { area: 'Problem Solving', change: +13, tip: 'Algorithmic thinking is stronger. Practice more dynamic programming and graph problems.', icon: <Brain size={14} className="text-amber-500" /> },
                  { area: 'System Design', change: +17, tip: 'Biggest growth area. Continue practicing scalability and distributed systems concepts.', icon: <Award size={14} className="text-emerald-500" /> },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E8ECF4]">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#E8ECF4] flex items-center justify-center shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-700 text-[#0D1B3E]">{item.area}</p>
                        <span className="text-xs font-700 text-emerald-600 flex items-center gap-0.5"><ArrowUp size={10} />+{item.change}%</span>
                      </div>
                      <p className="text-xs text-[#6B7A99] leading-relaxed">{item.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
