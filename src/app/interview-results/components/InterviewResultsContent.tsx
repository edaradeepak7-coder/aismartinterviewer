'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle, Star, TrendingUp, MessageSquare, Video, ChevronDown, ChevronUp, Award, ThumbsUp, ThumbsDown, BarChart2, Clock, Target, Zap, ArrowLeft, Download, AlertCircle, Loader2, RefreshCw, TrendingDown, ShieldCheck, BookOpen, Users, Lightbulb, MessageCircle, Brain, Mic, CheckSquare, XSquare, Sparkles, ListChecks, AlertTriangle } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';
import { interviewService, interviewResultsService, responseService } from '@/lib/services/interviewService';
import { jobOfferService } from '@/lib/services/offerService';
import { roleBenchmarkService } from '@/lib/services/notificationService';
import { resolveRecordingPlaybackUrl } from '@/lib/webrtc/useSessionRecorder';
import toast from 'react-hot-toast';

interface CompetencyScore {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
  level: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement';
}

interface AIFeedbackSection {
  title: string;
  content: string;
  type: 'strength' | 'improvement' | 'neutral';
}

interface AnswerFeedback {
  questionNumber: number;
  question: string;
  answerSummary: string;
  score: number;
  communicationScore: number;
  technicalScore: number;
  strengths: string[];
  improvements: string[];
  idealAnswer: string;
}

interface ImprovementTip {
  area: string;
  tip: string;
  priority: 'high' | 'medium' | 'low';
  resources?: string[];
}

interface ResultData {
  candidateName: string;
  role: string;
  company: string;
  interviewDate: string;
  duration: string;
  questionsAnswered: number;
  totalQuestions: number;
  finalScore: number;
  communicationScore: number;
  technicalDepthScore: number;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | null;
  interviewId: string;
  candidateId: string | null;
  hasRecording: boolean;
  recordingUrl: string | null;
  competencies: CompetencyScore[];
  aiFeedback: AIFeedbackSection[];
  transcriptHighlights: { timestamp: string; text: string }[];
  answerFeedbacks: AnswerFeedback[];
  weakAreas: string[];
  improvementTips: ImprovementTip[];
}

const scoreColor = (score: number) => {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 55) return 'text-amber-400';
  return 'text-red-400';
};

const scoreBg = (score: number) => {
  if (score >= 85) return 'bg-emerald-400';
  if (score >= 70) return 'bg-blue-400';
  if (score >= 55) return 'bg-amber-400';
  return 'bg-red-400';
};

const levelBadge = (level: CompetencyScore['level']) => {
  const map: Record<string, string> = {
    'Excellent': 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25',
    'Good': 'bg-blue-400/15 text-blue-400 border-blue-400/25',
    'Satisfactory': 'bg-amber-400/15 text-amber-400 border-amber-400/25',
    'Needs Improvement': 'bg-red-400/15 text-red-400 border-red-400/25',
  };
  return map[level] || map['Good'];
};

const recommendationConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  strong_yes: { label: 'Strong Hire', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/25', icon: <Award size={16} /> },
  yes: { label: 'Hire', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/25', icon: <ThumbsUp size={16} /> },
  maybe: { label: 'Consider', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/25', icon: <AlertCircle size={16} /> },
  no: { label: 'Decline', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/25', icon: <ThumbsDown size={16} /> },
};

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? '#34d399' : score >= 70 ? '#60a5fa' : score >= 55 ? '#fbbf24' : '#f87171';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-800 tabular-nums ${scoreColor(score)}`}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Benchmark Comparison Bar ─────────────────────────────────────────────────
function BenchmarkBar({ name, score, benchmark }: { name: string; score: number; benchmark: number }) {
  const diff = score - benchmark;
  const isAbove = diff >= 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-500">{name}</span>
        <div className="flex items-center gap-2">
          <span className={`font-700 tabular-nums ${scoreColor(score)}`}>{score}</span>
          <span className="text-muted-foreground/50">vs</span>
          <span className="text-muted-foreground tabular-nums">{benchmark}</span>
          <span className={`flex items-center gap-0.5 text-[11px] font-600 ${isAbove ? 'text-emerald-400' : 'text-red-400'}`}>
            {isAbove ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isAbove ? '+' : ''}{diff}
          </span>
        </div>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10" style={{ left: `${benchmark}%` }} />
        <div className={`h-full rounded-full transition-all duration-700 ${scoreBg(score)}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ─── Strength / Gap Cards ─────────────────────────────────────────────────────
function StrengthGapSection({ competencies }: { competencies: CompetencyScore[] }) {
  const strengths = competencies.filter(c => c.level === 'Excellent' || c.level === 'Good');
  const gaps = competencies.filter(c => c.level === 'Needs Improvement' || c.level === 'Satisfactory');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-card border border-emerald-400/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
            <ShieldCheck size={14} className="text-emerald-400" />
          </div>
          <h3 className="text-sm font-600 text-foreground">Strength Areas</h3>
          <span className="ml-auto text-xs bg-emerald-400/15 text-emerald-400 rounded-full px-2 py-0.5 font-600">{strengths.length}</span>
        </div>
        {strengths.length === 0 ? (
          <p className="text-sm text-muted-foreground">No standout strengths identified yet.</p>
        ) : (
          <div className="space-y-3">
            {strengths.map(s => (
              <div key={s.name} className="flex items-start gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${scoreBg(s.score)}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-500 text-foreground">{s.name}</span>
                    <span className={`text-xs font-700 tabular-nums ${scoreColor(s.score)}`}>{s.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{s.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-amber-400/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-400/15 flex items-center justify-center">
            <BookOpen size={14} className="text-amber-400" />
          </div>
          <h3 className="text-sm font-600 text-foreground">Improvement Gaps</h3>
          <span className="ml-auto text-xs bg-amber-400/15 text-amber-400 rounded-full px-2 py-0.5 font-600">{gaps.length}</span>
        </div>
        {gaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No significant gaps identified.</p>
        ) : (
          <div className="space-y-3">
            {gaps.map(g => (
              <div key={g.name} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-amber-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-500 text-foreground">{g.name}</span>
                    <span className={`text-xs font-700 tabular-nums ${scoreColor(g.score)}`}>{g.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{g.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Answer-by-Answer Feedback ────────────────────────────────────────────────
function AnswerBreakdown({ feedbacks }: { feedbacks: AnswerFeedback[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (feedbacks.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <MessageCircle size={32} className="text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Answer-by-answer feedback will appear after AI evaluation completes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedbacks.map((fb) => {
        const isOpen = expanded === fb.questionNumber;
        return (
          <div key={fb.questionNumber} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : fb.questionNumber)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-800 shrink-0 ${scoreBg(fb.score)} text-white`}>
                {fb.questionNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-500 text-foreground truncate">{fb.question}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mic size={10} /> Comm: <span className={`font-700 ${scoreColor(fb.communicationScore)}`}>{fb.communicationScore}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Brain size={10} /> Tech: <span className={`font-700 ${scoreColor(fb.technicalScore)}`}>{fb.technicalScore}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className={`text-lg font-800 tabular-nums ${scoreColor(fb.score)}`}>{fb.score}</div>
                  <div className="text-[10px] text-muted-foreground">Score</div>
                </div>
                {isOpen ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border bg-muted/10 px-5 py-4 space-y-4">
                {/* Score bars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Overall Score', value: fb.score },
                    { label: 'Communication', value: fb.communicationScore },
                    { label: 'Technical Depth', value: fb.technicalScore },
                  ].map(s => (
                    <div key={s.label} className="bg-card rounded-lg p-3 border border-border">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                        <span className={`text-sm font-800 tabular-nums ${scoreColor(s.value)}`}>{s.value}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBg(s.value)}`} style={{ width: `${s.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Answer summary */}
                {fb.answerSummary && (
                  <div className="bg-slate-800/40 rounded-lg p-3">
                    <p className="text-xs font-600 text-slate-400 mb-1">Your Answer Summary</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{fb.answerSummary}</p>
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fb.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-700 text-emerald-400 mb-2 flex items-center gap-1">
                        <CheckSquare size={11} /> What you did well
                      </p>
                      <ul className="space-y-1.5">
                        {fb.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {fb.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-700 text-amber-400 mb-2 flex items-center gap-1">
                        <XSquare size={11} /> Areas to improve
                      </p>
                      <ul className="space-y-1.5">
                        {fb.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Ideal answer */}
                {fb.idealAnswer && (
                  <div className="bg-blue-400/5 border border-blue-400/20 rounded-lg p-3">
                    <p className="text-xs font-700 text-blue-400 mb-1.5 flex items-center gap-1">
                      <Lightbulb size={11} /> Ideal Answer Direction
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{fb.idealAnswer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Improvement Tips ─────────────────────────────────────────────────────────
function ImprovementTipsSection({ tips, weakAreas }: { tips: ImprovementTip[]; weakAreas: string[] }) {
  const priorityConfig = {
    high: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', label: 'High Priority' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', label: 'Medium' },
    low: { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', label: 'Low' },
  };

  return (
    <div className="space-y-5">
      {/* Weak Areas */}
      {weakAreas.length > 0 && (
        <div className="bg-card border border-red-400/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-red-400/15 flex items-center justify-center">
              <AlertTriangle size={14} className="text-red-400" />
            </div>
            <h3 className="text-sm font-600 text-foreground">Identified Weak Areas</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {weakAreas.map((area, i) => (
              <span key={i} className="px-3 py-1.5 bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-600 rounded-full">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI-Generated Tips */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-primary" />
          <h3 className="text-base font-600 text-foreground">AI-Personalized Improvement Tips</h3>
        </div>
        {tips.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Sparkles size={32} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Personalized tips will appear after AI evaluation completes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tips.map((tip, i) => {
              const cfg = priorityConfig[tip.priority];
              return (
                <div key={i} className={`bg-card border ${cfg.bg} rounded-xl p-5`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb size={15} className={cfg.color} />
                      <span className="text-sm font-600 text-foreground">{tip.area}</span>
                    </div>
                    <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} shrink-0`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip.tip}</p>
                  {tip.resources && tip.resources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tip.resources.map((r, ri) => (
                        <span key={ri} className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                          📚 {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InterviewResultsContent() {
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);
  const [actionTaken, setActionTaken] = useState<'offered' | 'declined' | null>(null);
  const [showConfirm, setShowConfirm] = useState<'offer' | 'decline' | null>(null);
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pendingInterview, setPendingInterview] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<Record<string, number> | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'answers' | 'competencies' | 'benchmark' | 'tips'>('overview');

  const { response: aiResponse, isLoading: aiLoading, error: aiError, sendMessage } = useChat('OPEN_AI', 'gpt-4o', false);

  useEffect(() => {
    if (aiError) toast.error(aiError.message);
  }, [aiError]);

  useEffect(() => {
    if (aiResponse && !aiLoading && pendingInterview && generating) {
      processAIResponse(aiResponse, pendingInterview);
    }
  }, [aiResponse, aiLoading]);

  useEffect(() => {
    let cancelled = false;
    async function resolvePlayback() {
      const raw = resultData?.recordingUrl;
      if (!raw) {
        setPlaybackUrl(null);
        return;
      }
      setPlaybackLoading(true);
      try {
        const url = await resolveRecordingPlaybackUrl(raw);
        if (!cancelled) setPlaybackUrl(url);
      } finally {
        if (!cancelled) setPlaybackLoading(false);
      }
    }
    void resolvePlayback();
    return () => { cancelled = true; };
  }, [resultData?.recordingUrl]);

  const buildResultData = useCallback((interview: any, result: any) => {
    const candidateName = interview.candidates?.name || 'Candidate';
    const finalScore = result.final_score ?? interview.overall_score ?? 0;
    const comm = result.communication_score ?? interview.communication_score;
    const tech = result.technical_depth_score ?? interview.technical_score;
    const rec = result.recommendation ?? interview.recommendation ?? null;
    setResultData({
      candidateName,
      role: interview.role,
      company: interview.company,
      interviewDate: new Date(interview.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      duration: interview.duration_minutes ? `${interview.duration_minutes} min` : 'N/A',
      questionsAnswered: interview.answered_count,
      totalQuestions: interview.question_count,
      finalScore: Number(finalScore) || 0,
      communicationScore: typeof comm === 'number' ? comm : 0,
      technicalDepthScore: typeof tech === 'number' ? tech : 0,
      recommendation: rec,
      interviewId: interview.id,
      candidateId: interview.candidate_id || null,
      hasRecording: Boolean(interview.recording_url || interview.video_url),
      recordingUrl: interview.recording_url || interview.video_url || null,
      competencies: Array.isArray(result.competencies) ? result.competencies : [],
      aiFeedback: Array.isArray(result.ai_feedback) ? result.ai_feedback : [],
      transcriptHighlights: Array.isArray(result.transcript_highlights) ? result.transcript_highlights : [],
      answerFeedbacks: Array.isArray(result.answer_feedbacks) ? result.answer_feedbacks : [],
      weakAreas: Array.isArray(result.weak_areas) ? result.weak_areas : [],
      improvementTips: Array.isArray(result.improvement_tips) ? result.improvement_tips : [],
    });
  }, []);

  const buildResultDataFromInterview = useCallback((interview: any) => {
    const candidateName = interview.candidates?.name || 'Candidate';
    const score = interview.overall_score ?? 0;
    const commScore = typeof interview.communication_score === 'number' ? interview.communication_score : 0;
    const techScore = typeof interview.technical_score === 'number' ? interview.technical_score : 0;
    setResultData({
      candidateName,
      role: interview.role,
      company: interview.company,
      interviewDate: new Date(interview.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      duration: interview.duration_minutes ? `${interview.duration_minutes} min` : 'N/A',
      questionsAnswered: interview.answered_count,
      totalQuestions: interview.question_count,
      finalScore: Number(score) || 0,
      communicationScore: commScore,
      technicalDepthScore: techScore,
      recommendation: interview.recommendation ?? null,
      interviewId: interview.id,
      candidateId: interview.candidate_id || null,
      hasRecording: Boolean(interview.recording_url || interview.video_url),
      recordingUrl: interview.recording_url || interview.video_url || null,
      // Only real stored competencies — never invent Problem Solving / System Design offsets
      competencies: [],
      aiFeedback: [],
      transcriptHighlights: [],
      answerFeedbacks: [],
      weakAreas: [],
      improvementTips: [],
    });
  }, []);

  const processAIResponse = async (responseText: string, interview: any) => {
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const candidateName = interview.candidates?.name || 'Candidate';

      await interviewResultsService.upsert({
        interview_id: interview.id,
        final_score: parsed.finalScore,
        recommendation: parsed.recommendation,
        competencies: parsed.competencies,
        ai_feedback: parsed.aiFeedback,
        transcript_highlights: parsed.transcriptHighlights,
        communication_score: parsed.communicationScore,
        technical_depth_score: parsed.technicalDepthScore,
        answer_feedbacks: parsed.answerFeedbacks,
        weak_areas: parsed.weakAreas,
        improvement_tips: parsed.improvementTips,
      });

      await interviewService.update(interview.id, {
        overall_score: parsed.finalScore,
        recommendation: parsed.recommendation,
        ai_feedback_generated: true,
        status: 'evaluated',
        communication_score: parsed.communicationScore,
        technical_score: parsed.technicalDepthScore,
      });

      setResultData({
        candidateName,
        role: interview.role,
        company: interview.company,
        interviewDate: new Date(interview.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        duration: interview.duration_minutes ? `${interview.duration_minutes} min` : 'N/A',
        questionsAnswered: interview.answered_count,
        totalQuestions: interview.question_count,
        finalScore: parsed.finalScore,
        communicationScore: typeof parsed.communicationScore === 'number' ? parsed.communicationScore : 0,
        technicalDepthScore: typeof parsed.technicalDepthScore === 'number' ? parsed.technicalDepthScore : 0,
        recommendation: parsed.recommendation ?? null,
        interviewId: interview.id,
        candidateId: interview.candidate_id || null,
        hasRecording: Boolean(interview.recording_url || interview.video_url),
        recordingUrl: interview.recording_url || interview.video_url || null,
        competencies: Array.isArray(parsed.competencies) ? parsed.competencies : [],
        aiFeedback: Array.isArray(parsed.aiFeedback) ? parsed.aiFeedback : [],
        transcriptHighlights: Array.isArray(parsed.transcriptHighlights) ? parsed.transcriptHighlights : [],
        answerFeedbacks: parsed.answerFeedbacks || [],
        weakAreas: parsed.weakAreas || [],
        improvementTips: parsed.improvementTips || [],
      });

      toast.success('AI evaluation complete');
    } catch (err) {
      console.error('processAIResponse error:', err);
      buildResultDataFromInterview(interview);
      toast.error('Could not parse AI response. Showing available scores.');
    } finally {
      setGenerating(false);
      setPendingInterview(null);
    }
  };

  const triggerAIGeneration = useCallback((interview: any, responses: any[]) => {
    setGenerating(true);
    setPendingInterview(interview);
    const candidateName = interview.candidates?.name || 'Candidate';

    const responseSummary = responses
      .map((r: any, i: number) => `Q${i + 1}: ${r.question_text || 'Question'}\nAnswer: ${r.answer_text || '[Voice response]'}`)
      .join('\n\n');

    const prompt = `You are an expert technical interviewer. Evaluate this interview for ${candidateName} applying for ${interview.role} at ${interview.company}.

Interview Responses:
${responseSummary}

Provide a comprehensive JSON evaluation with this EXACT structure:
{
  "finalScore": <0-100 integer>,
  "communicationScore": <0-100 integer>,
  "technicalDepthScore": <0-100 integer>,
  "recommendation": <"strong_yes"|"yes"|"maybe"|"no">,
  "competencies": [
    {"name": "Technical Depth", "score": <0-100>, "maxScore": 100, "level": <"Excellent"|"Good"|"Satisfactory"|"Needs Improvement">, "feedback": "<2 sentences>"},
    {"name": "Problem Solving", "score": <0-100>, "maxScore": 100, "level": <"Excellent"|"Good"|"Satisfactory"|"Needs Improvement">, "feedback": "<2 sentences>"},
    {"name": "System Design", "score": <0-100>, "maxScore": 100, "level": <"Excellent"|"Good"|"Satisfactory"|"Needs Improvement">, "feedback": "<2 sentences>"},
    {"name": "Communication", "score": <0-100>, "maxScore": 100, "level": <"Excellent"|"Good"|"Satisfactory"|"Needs Improvement">, "feedback": "<2 sentences>"},
    {"name": "Role Alignment", "score": <0-100>, "maxScore": 100, "level": <"Excellent"|"Good"|"Satisfactory"|"Needs Improvement">, "feedback": "<2 sentences>"}
  ],
  "aiFeedback": [
    {"title": "Technical Expertise", "content": "<3 sentences>", "type": "strength"},
    {"title": "Communication Style", "content": "<3 sentences>", "type": "strength"},
    {"title": "Areas for Growth", "content": "<3 sentences>", "type": "improvement"},
    {"title": "Cultural Indicators", "content": "<3 sentences>", "type": "neutral"}
  ],
  "transcriptHighlights": [
    {"timestamp": "02:15", "text": "<notable quote>"},
    {"timestamp": "08:42", "text": "<notable quote>"},
    {"timestamp": "15:30", "text": "<notable quote>"}
  ],
  "answerFeedbacks": [
    {
      "questionNumber": 1,
      "question": "<question text>",
      "answerSummary": "<2-sentence summary of what the candidate said>",
      "score": <0-100>,
      "communicationScore": <0-100>,
      "technicalScore": <0-100>,
      "strengths": ["<strength 1>", "<strength 2>"],
      "improvements": ["<improvement 1>", "<improvement 2>"],
      "idealAnswer": "<what an ideal answer would cover in 2-3 sentences>"
    }
  ],
  "weakAreas": ["<area 1>", "<area 2>", "<area 3>"],
  "improvementTips": [
    {
      "area": "<skill area>",
      "tip": "<specific, actionable improvement tip in 2-3 sentences>",
      "priority": <"high"|"medium"|"low">,
      "resources": ["<resource 1>", "<resource 2>"]
    }
  ]
}

Return ONLY valid JSON, no markdown. Generate answerFeedbacks for each question in the responses. Generate 3-5 improvementTips personalized to this candidate's performance.`;

    sendMessage(
      [{ role: 'user', content: prompt }],
      { max_completion_tokens: 3000 }
    );
  }, [sendMessage]);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const interviews = await interviewService.getAll();
      const latest = interviews.find(i => i.status === 'evaluated' || i.status === 'completed');

      if (!latest) { setLoading(false); return; }

      const roleBenchmarks = await roleBenchmarkService.getByRole(latest.role);
      setBenchmarks(roleBenchmarks);

      const existingResult = await interviewResultsService.getByInterviewId(latest.id);

      if (existingResult && Array.isArray(existingResult.competencies) && existingResult.competencies.length > 0) {
        buildResultData(latest, existingResult);
        setLoading(false);
      } else {
        const responses = await responseService.getByInterview(latest.id);
        setLoading(false);
        if (responses.length > 0) {
          triggerAIGeneration(latest, responses);
        } else {
          buildResultDataFromInterview(latest);
        }
      }
    } catch (err) {
      console.error('loadResults error:', err);
      setLoading(false);
    }
  }, [buildResultData, buildResultDataFromInterview, triggerAIGeneration]);

  useEffect(() => {
    loadResults();
  }, []);

  const handleAction = async (action: 'offer' | 'decline') => {
    if (!resultData?.interviewId || decisionSaving) return;
    setDecisionSaving(true);
    const recommendation = action === 'offer' ? 'yes' : 'no';
    try {
      const updated = await interviewService.update(resultData.interviewId, { recommendation });
      if (!updated) throw new Error('Update failed');
      setResultData((prev) => prev ? { ...prev, recommendation } : prev);

      if (action === 'offer') {
        if (!resultData.candidateId) {
          toast.error('Recommendation saved, but candidate id is missing — offer not created');
          setActionTaken(null);
          setShowConfirm(null);
          return;
        }
        const offer = await jobOfferService.create({
          interview_id: resultData.interviewId,
          candidate_id: resultData.candidateId,
          role: resultData.role,
          company: resultData.company,
        });
        if (offer.error || !offer.data) {
          toast.error(offer.error || 'Recommendation saved, but offer could not be created');
          setShowConfirm(null);
          return;
        }
        setActionTaken('offered');
        setShowConfirm(null);
        toast.success(offer.reused ? 'Pending offer already exists for this interview' : 'Offer extended — candidate can review in Job Offers');
      } else {
        setActionTaken('declined');
        setShowConfirm(null);
        toast.success('Recommendation saved: Decline');
      }
    } catch (err) {
      console.error('handleAction error:', err);
      toast.error('Could not save hiring decision');
    } finally {
      setDecisionSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading interview results...</p>
        </div>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle size={40} className="text-muted-foreground mx-auto" />
          <p className="text-foreground font-500">No interview results found</p>
          <p className="text-sm text-muted-foreground">Complete an interview to see results here.</p>
          <Link href="/live-interview" className="inline-block mt-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-500">
            Start Interview
          </Link>
        </div>
      </div>
    );
  }

  const rec = resultData.recommendation
    ? (recommendationConfig[resultData.recommendation] || recommendationConfig['maybe'])
    : { label: 'Not evaluated', color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/25', icon: <AlertCircle size={16} /> };
  const avgBenchmark = typeof benchmarks?.avg === 'number' ? benchmarks.avg : null;
  const decisionDone =
    actionTaken ??
    (resultData.recommendation === 'yes' || resultData.recommendation === 'strong_yes'
      ? 'offered'
      : resultData.recommendation === 'no'
        ? 'declined'
        : null);
  const persistedDecision =
    actionTaken ??
    (resultData.recommendation === 'yes' || resultData.recommendation === 'strong_yes'
      ? 'offered'
      : resultData.recommendation === 'no'
        ? 'declined'
        : null);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
    { key: 'answers', label: 'Answer Breakdown', icon: <ListChecks size={14} /> },
    { key: 'competencies', label: 'Competencies', icon: <Target size={14} /> },
    { key: 'benchmark', label: 'vs Avg Candidate', icon: <Users size={14} /> },
    { key: 'tips', label: 'AI Tips', icon: <Sparkles size={14} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-border hidden sm:inline">/</span>
          <span className="text-sm font-500 text-foreground truncate">Interview Results</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(generating || aiLoading) && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 size={13} className="animate-spin" />
              <span className="hidden sm:inline">Generating AI evaluation...</span>
            </div>
          )}
          <button onClick={loadResults} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors">
            <RefreshCw size={13} />
          </button>
          <button className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors">
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Hero: Candidate + Scores */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 sm:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-lg font-700 text-primary shrink-0">
                  {resultData.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h1 className="text-xl font-700 text-white">{resultData.candidateName}</h1>
                  <p className="text-sm text-slate-400">{resultData.role} · {resultData.company}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Clock size={12} /> {resultData.duration}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Target size={12} /> {resultData.questionsAnswered}/{resultData.totalQuestions} questions</span>
                    <span className="text-xs text-slate-500">{resultData.interviewDate}</span>
                  </div>
                </div>
              </div>

              {/* Score rings */}
              {(generating || aiLoading) ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <div className="text-xs text-slate-400">Scoring...</div>
                </div>
              ) : (
                <div className="flex items-center gap-4 sm:gap-6">
                  <ScoreRing score={resultData.finalScore} size={80} label="Final Score" />
                  <ScoreRing score={resultData.communicationScore} size={64} label="Communication" />
                  <ScoreRing score={resultData.technicalDepthScore} size={64} label="Technical" />
                </div>
              )}
            </div>

            {/* Recommendation + benchmark */}
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${rec.bg}`}>
                <span className={rec.color}>{rec.icon}</span>
                <div>
                  <div className={`text-sm font-600 ${rec.color}`}>{rec.label}</div>
                  <div className="text-xs text-slate-400">AI Recommendation</div>
                </div>
              </div>
              {benchmarks && avgBenchmark !== null && (
                <div className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg ${resultData.finalScore >= avgBenchmark ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'}`}>
                  {resultData.finalScore >= avgBenchmark ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span className="font-600">{resultData.finalScore >= avgBenchmark ? '+' : ''}{resultData.finalScore - avgBenchmark}</span>
                  <span className="text-xs opacity-70">vs avg candidate ({avgBenchmark})</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats row */}
          {resultData.competencies.length >= 4 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
              {[
                { label: resultData.competencies[0]?.name || 'Technical Depth', value: resultData.competencies[0]?.score || 0, icon: <Zap size={14} /> },
                { label: resultData.competencies[1]?.name || 'Problem Solving', value: resultData.competencies[1]?.score || 0, icon: <Target size={14} /> },
                { label: resultData.competencies[3]?.name || 'Communication', value: resultData.competencies[3]?.score || 0, icon: <MessageSquare size={14} /> },
                { label: resultData.competencies[4]?.name || 'Role Alignment', value: resultData.competencies[4]?.score || 0, icon: <TrendingUp size={14} /> },
              ].map((stat) => (
                <div key={stat.label} className="px-4 sm:px-6 py-4 flex items-center gap-3">
                  <span className="text-muted-foreground">{stat.icon}</span>
                  <div>
                    <div className={`text-lg font-700 tabular-nums ${scoreColor(stat.value)}`}>{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-500 whitespace-nowrap transition-all ${
                activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <StrengthGapSection competencies={resultData.competencies} />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Video size={16} className="text-primary" />
                  <h2 className="text-base font-600 text-foreground">Video Replay</h2>
                </div>
                <div className="bg-slate-900 border border-border rounded-lg overflow-hidden aspect-video relative flex items-center justify-center">
                  {playbackUrl ? (
                    <video
                      key={playbackUrl}
                      src={playbackUrl}
                      controls
                      playsInline
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
                      <div className="relative z-10 text-center px-4">
                        {playbackLoading ? (
                          <Loader2 size={28} className="text-slate-400 mx-auto mb-2 animate-spin" />
                        ) : (
                          <Video size={28} className="text-slate-500 mx-auto mb-2" />
                        )}
                        <p className="text-sm text-slate-300 font-500">
                          {playbackLoading
                            ? 'Loading recording…'
                            : resultData.hasRecording
                              ? 'Recording unavailable in this view'
                              : 'No recording available'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {resultData.hasRecording
                            ? 'Could not create a playback link. Check storage policies or re-open results.'
                            : 'Record in the live interview room to enable replay here.'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {resultData.transcriptHighlights.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="text-sm font-600 text-foreground mb-3">Key Moments</h3>
                  <div className="space-y-3">
                    {resultData.transcriptHighlights.map((h, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-xs font-600 text-primary tabular-nums shrink-0 mt-0.5">{h.timestamp}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{h.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Answer Breakdown */}
        {activeTab === 'answers' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ListChecks size={16} className="text-primary" />
              <h2 className="text-base font-600 text-foreground">Answer-by-Answer Feedback</h2>
              {resultData.answerFeedbacks.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-600">
                  {resultData.answerFeedbacks.length} answers
                </span>
              )}
            </div>
            {(generating || aiLoading) ? (
              <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">GPT-4o is analyzing each answer...</p>
              </div>
            ) : (
              <AnswerBreakdown feedbacks={resultData.answerFeedbacks} />
            )}
          </div>
        )}

        {/* Tab: Competencies */}
        {activeTab === 'competencies' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-primary" />
              <h2 className="text-base font-600 text-foreground">Competency Breakdown</h2>
            </div>
            {(generating || aiLoading) ? (
              <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">GPT-4o is analyzing responses...</p>
              </div>
            ) : resultData.competencies.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <BarChart2 size={28} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No competency breakdown stored for this interview yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Run AI evaluation when responses are available, or check overall scores above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resultData.competencies.map((comp) => {
                  const isExpanded = expandedCompetency === comp.name;
                  const bench = typeof benchmarks?.[comp.name] === 'number' ? benchmarks[comp.name] : undefined;
                  return (
                    <div key={comp.name} className="bg-card border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedCompetency(isExpanded ? null : comp.name)}
                        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-500 text-foreground">{comp.name}</span>
                            <div className="flex items-center gap-2">
                              {bench && (
                                <span className={`text-xs ${comp.score >= bench ? 'text-emerald-400' : 'text-amber-400'} flex items-center gap-0.5`}>
                                  {comp.score >= bench ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                  vs {bench}
                                </span>
                              )}
                              <span className={`text-xs font-500 px-2 py-0.5 rounded-full border ${levelBadge(comp.level)}`}>{comp.level}</span>
                              <span className={`text-sm font-700 tabular-nums ${scoreColor(comp.score)}`}>{comp.score}</span>
                            </div>
                          </div>
                          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                            {bench && <div className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10" style={{ left: `${bench}%` }} />}
                            <div className={`h-full rounded-full transition-all duration-500 ${scoreBg(comp.score)}`} style={{ width: `${comp.score}%` }} />
                          </div>
                        </div>
                        <span className="text-muted-foreground shrink-0">
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-4 border-t border-border bg-muted/20">
                          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{comp.feedback}</p>
                          {bench && (
                            <div className={`mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${comp.score >= bench ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'}`}>
                              {comp.score >= bench ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              {comp.score >= bench ? `${comp.score - bench} points above` : `${bench - comp.score} points below`} role benchmark ({bench})
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Benchmark */}
        {activeTab === 'benchmark' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <h2 className="text-base font-600 text-foreground">Comparison to Average Candidate</h2>
              <span className="text-xs text-muted-foreground">— {resultData.role}</span>
            </div>
            {!benchmarks ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Users size={32} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No benchmark data available for this role.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overall comparison */}
                <div className="bg-card border border-border rounded-xl p-6">
                  {avgBenchmark === null ? (
                    <p className="text-sm text-muted-foreground mb-6">Overall average benchmark is not configured for this role. Per-competency benchmarks below still apply when present.</p>
                  ) : null}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Your Score', value: resultData.finalScore, sub: 'Overall' },
                      ...(avgBenchmark !== null ? [
                        { label: 'Avg Candidate', value: avgBenchmark, sub: 'Benchmark' },
                        { label: 'Difference', value: Math.abs(resultData.finalScore - avgBenchmark), sub: resultData.finalScore >= avgBenchmark ? 'Above avg' : 'Below avg', isAbove: resultData.finalScore >= avgBenchmark },
                      ] : []),
                    ].map((s, i) => (
                      <div key={i} className="text-center p-4 bg-muted/30 rounded-xl">
                        <div className={`text-3xl font-800 tabular-nums ${i === 2 ? (s.isAbove ? 'text-emerald-400' : 'text-red-400') : scoreColor(s.value)}`}>
                          {i === 2 && (s.isAbove ? '+' : '-')}{s.value}
                        </div>
                        <div className="text-sm font-600 text-foreground mt-1">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Competency</span>
                      <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Candidate</span>
                        <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-slate-500 inline-block" /> Avg</span>
                      </span>
                    </div>
                    {resultData.competencies.map((comp) => {
                      const bench = benchmarks[comp.name];
                      if (typeof bench !== 'number') return null;
                      return <BenchmarkBar key={comp.name} name={comp.name} score={comp.score} benchmark={bench} />;
                    })}
                    {typeof benchmarks['Communication'] === 'number' && (
                      <BenchmarkBar name="Communication (Overall)" score={resultData.communicationScore} benchmark={benchmarks['Communication']} />
                    )}
                    {typeof benchmarks['Technical Depth'] === 'number' && (
                      <BenchmarkBar name="Technical Depth (Overall)" score={resultData.technicalDepthScore} benchmark={benchmarks['Technical Depth']} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: AI Tips */}
        {activeTab === 'tips' && (
          <div className="space-y-4">
            {(generating || aiLoading) ? (
              <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating personalized improvement tips...</p>
              </div>
            ) : (
              <ImprovementTipsSection tips={resultData.improvementTips} weakAreas={resultData.weakAreas} />
            )}

            {/* AI Feedback sections */}
            {resultData.aiFeedback.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star size={16} className="text-primary" />
                  <h2 className="text-base font-600 text-foreground">AI Evaluation Feedback</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resultData.aiFeedback.map((section) => {
                    const typeStyle: Record<string, string> = {
                      strength: 'border-l-emerald-400 bg-emerald-400/5',
                      improvement: 'border-l-amber-400 bg-amber-400/5',
                      neutral: 'border-l-blue-400 bg-blue-400/5',
                    };
                    const titleColor: Record<string, string> = {
                      strength: 'text-emerald-400',
                      improvement: 'text-amber-400',
                      neutral: 'text-blue-400',
                    };
                    return (
                      <div key={section.title} className={`bg-card border border-border border-l-4 ${typeStyle[section.type] || typeStyle['neutral']} rounded-lg p-5`}>
                        <h3 className={`text-sm font-600 mb-2 ${titleColor[section.type] || titleColor['neutral']}`}>{section.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hiring Decision */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-600 text-foreground">Hiring Decision</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Based on the AI evaluation, make your final decision for {resultData.candidateName}.
              </p>
            </div>
            {decisionDone ? (
              <div className={`flex items-center gap-2 px-5 py-3 rounded-lg border ${decisionDone === 'offered' ? 'bg-emerald-400/10 border-emerald-400/25 text-emerald-400' : 'bg-red-400/10 border-red-400/25 text-red-400'}`}>
                <CheckCircle size={16} />
                <span className="text-sm font-600">{decisionDone === 'offered' ? 'Offer Extended' : 'Candidate Declined'}</span>
              </div>
            ) : showConfirm ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {showConfirm === 'offer' ? 'Confirm extending offer?' : 'Confirm declining candidate?'}
                </span>
                <button
                  onClick={() => handleAction(showConfirm)}
                  disabled={decisionSaving}
                  className={`px-4 py-2 rounded-md text-sm font-600 transition-all duration-150 active:scale-95 disabled:opacity-60 ${showConfirm === 'offer' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                >
                  {decisionSaving ? 'Saving…' : 'Confirm'}
                </button>
                <button onClick={() => setShowConfirm(null)} className="px-4 py-2 rounded-md text-sm font-500 text-muted-foreground hover:text-foreground border border-border transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => setShowConfirm('decline')} className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-600 text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-all duration-150 active:scale-95">
                  <ThumbsDown size={15} /> Decline
                </button>
                <button onClick={() => setShowConfirm('offer')} className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-600 bg-primary hover:bg-primary/90 text-white transition-all duration-150 active:scale-95">
                  <ThumbsUp size={15} /> Extend Offer
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
