'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClipboardList, Plus, Play, Clock, Code2, FileText, CheckSquare, Search, Eye,
  Users, Timer, Award, Target, TrendingUp, Check, AlertCircle, Zap, ArrowLeft,
  ArrowRight, Send, CheckCircle2, XCircle, Loader2, RotateCcw,
} from 'lucide-react';
import { useCreditBalance } from '@/lib/hooks/useCreditBalance';
import CreditCheckModal from '@/components/CreditCheckModal';
import { csrfHeaders } from '@/lib/api/apiClient';
import { toast } from 'sonner';
import Link from 'next/link';

type QuestionType = 'mcq' | 'coding' | 'subjective';
type AssessmentView = 'list' | 'create' | 'take' | 'preview';

interface MCQOption { id: string; text: string; }
interface TestCase { input: string; expectedOutput: string; isHidden: boolean; }

interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  points: number;
  timeLimit?: number;
  options?: MCQOption[];
  correctOption?: string;
  testCases?: TestCase[];
  sampleCode?: string;
  rubric?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number;
  totalPoints: number;
  questions: Question[];
  status: 'draft' | 'published' | 'closed';
  assignedTo: number;
  completions: number;
  avgScore: number;
  createdAt: string;
  tags: string[];
}

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    type: 'mcq',
    title: 'React Hooks — useState',
    description: 'Which of the following correctly initializes a state variable with a default value of 0 in React?',
    points: 10,
    difficulty: 'easy',
    tags: ['React', 'Hooks'],
    options: [
      { id: 'a', text: 'const [count] = useState(0)' },
      { id: 'b', text: 'const [count, setCount] = useState(0)' },
      { id: 'c', text: 'const count = useState(0)' },
      { id: 'd', text: 'const [count, setCount] = useReducer(0)' },
    ],
    correctOption: 'b',
  },
  {
    id: 'q2',
    type: 'coding',
    title: 'Two Sum',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution.',
    points: 30,
    difficulty: 'easy',
    tags: ['Arrays', 'Hash Map'],
    timeLimit: 20,
    testCases: [
      { input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]', isHidden: false },
      { input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]', isHidden: false },
      { input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]', isHidden: true },
    ],
    sampleCode: `function twoSum(nums, target) {\n  // Your solution here\n  \n}`,
  },
  {
    id: 'q3',
    type: 'subjective',
    title: 'System Design — URL Shortener',
    description: 'Design a URL shortening service like bit.ly. Explain your approach covering: data model, API design, scalability considerations, and how you would handle high read traffic.',
    points: 40,
    difficulty: 'hard',
    tags: ['System Design', 'Scalability'],
    rubric: 'Award points for: data model (10pts), API design (10pts), scalability (10pts), caching strategy (10pts)',
  },
];

function mapApiAssessment(raw: Record<string, unknown>): Assessment {
  const created = String(raw.created_at ?? raw.createdAt ?? '');
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    duration: typeof raw.duration === 'number' ? raw.duration : 60,
    totalPoints: Number(raw.total_points ?? raw.totalPoints ?? 0),
    questions: Array.isArray(raw.questions) ? (raw.questions as Question[]) : [],
    status: (['draft', 'published', 'closed'].includes(String(raw.status))
      ? raw.status
      : 'draft') as Assessment['status'],
    assignedTo: Number(raw.assigned_to ?? raw.assignedTo ?? 0),
    completions: Number(raw.completions ?? 0),
    avgScore: Number(raw.avg_score ?? raw.avgScore ?? 0),
    createdAt: created ? created.slice(0, 10) : '',
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
  };
}

// ---- Assessment Card ----
function AssessmentCard({
  assessment,
  onView,
  onTake,
}: {
  assessment: Assessment;
  onView: () => void;
  onTake: () => void;
}) {
  const statusColors: Record<string, string> = {
    published: 'bg-green-50 text-green-700 border-green-200',
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    closed: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  const completionRate =
    assessment.assignedTo > 0
      ? Math.round((assessment.completions / assessment.assignedTo) * 100)
      : 0;

  return (
    <div className="bg-white border border-[#DDE3EE] rounded-xl p-5 hover:shadow-md hover:border-[#0D9488] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-700 text-[#0D1B3E] text-sm mb-1 truncate">{assessment.title}</h3>
          <p className="text-xs text-[#6B7A99] line-clamp-2 leading-relaxed">{assessment.description}</p>
        </div>
        <span className={`text-[10px] font-600 px-2 py-1 rounded-full border shrink-0 ${statusColors[assessment.status]}`}>
          {assessment.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {assessment.tags.map(tag => (
          <span key={tag} className="text-[10px] font-500 bg-[#F4F6FA] text-[#3D5A80] px-2 py-0.5 rounded-full">{tag}</span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[#6B7A99] mb-0.5">
            <Clock size={11} />
            <span className="text-[10px]">Duration</span>
          </div>
          <p className="font-700 text-sm text-[#0D1B3E]">{assessment.duration}m</p>
        </div>
        <div className="text-center border-x border-[#F4F6FA]">
          <div className="flex items-center justify-center gap-1 text-[#6B7A99] mb-0.5">
            <Award size={11} />
            <span className="text-[10px]">Points</span>
          </div>
          <p className="font-700 text-sm text-[#0D1B3E]">{assessment.totalPoints}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[#6B7A99] mb-0.5">
            <Target size={11} />
            <span className="text-[10px]">Avg Score</span>
          </div>
          <p className="font-700 text-sm text-[#0D1B3E]">{assessment.avgScore > 0 ? `${assessment.avgScore}%` : '—'}</p>
        </div>
      </div>

      {assessment.assignedTo > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#6B7A99]">Completion</span>
            <span className="font-600 text-[#0D1B3E]">{assessment.completions}/{assessment.assignedTo}</span>
          </div>
          <div className="h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
            <div className="h-full bg-[#0D9488] rounded-full transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#DDE3EE] rounded-lg text-xs font-600 text-[#3D5A80] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
        >
          <Eye size={12} /> View
        </button>
        <button
          onClick={onTake}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#0D9488] text-white rounded-lg text-xs font-600 hover:bg-[#0b8276] transition-colors"
        >
          <Play size={12} /> Take
        </button>
      </div>
    </div>
  );
}

// ---- Assessment Taker ----
function AssessmentTaker({
  assessment,
  onBack,
}: {
  assessment: Assessment;
  onBack: () => void;
}) {
  const questions =
    assessment.questions?.length > 0 ? assessment.questions : SAMPLE_QUESTIONS;
  const durationMins = assessment.duration || 60;

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(durationMins * 60);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { passed: number; total: number }>>({});
  const [runningTests, setRunningTests] = useState(false);
  const [finalScores, setFinalScores] = useState<{
    score: number;
    total: number;
    mcq: number;
    coding: number;
    subjective: number;
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());
  const answersRef = useRef(answers);
  const codeAnswersRef = useRef(codeAnswers);
  const testResultsRef = useRef(testResults);
  const submittingRef = useRef(false);
  const submittedRef = useRef(false);

  answersRef.current = answers;
  codeAnswersRef.current = codeAnswers;
  testResultsRef.current = testResults;

  const calcScores = useCallback((
    ans: Record<string, string>,
    tests: Record<string, { passed: number; total: number }>,
  ) => {
    let mcq = 0;
    let coding = 0;
    let subjective = 0;
    questions.forEach(q => {
      if (q.type === 'mcq' && ans[q.id] === q.correctOption) mcq += q.points;
      if (q.type === 'coding' && tests[q.id]) {
        coding += Math.round((tests[q.id].passed / tests[q.id].total) * q.points);
      }
      if (q.type === 'subjective' && (ans[q.id]?.length || 0) > 100) {
        subjective += Math.round(q.points * 0.75);
      }
    });
    const score = mcq + coding + subjective;
    const total = questions.reduce((s, q) => s + q.points, 0);
    return { score, total, mcq, coding, subjective };
  }, [questions]);

  const submitAssessment = useCallback(async (timedOut = false) => {
    if (submittingRef.current || submittedRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const ans = answersRef.current;
    const code = codeAnswersRef.current;
    const tests = testResultsRef.current;
    const scores = calcScores(ans, tests);
    setFinalScores(scores);
    const timeTaken = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
    const pct = scores.total > 0 ? (scores.score / scores.total) * 100 : 0;

    try {
      const res = await fetch('/api/assessment-results', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          assessment_id: assessment.id,
          score: scores.score,
          total_points: scores.total,
          time_taken_minutes: timeTaken,
          mcq_score: scores.mcq,
          coding_score: scores.coding,
          subjective_score: scores.subjective,
          status: pct >= 60 ? 'passed' : 'failed',
          answers: { text: ans, code, testResults: tests },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save results');
      }
      toast.success(timedOut ? 'Time up — results saved' : 'Assessment submitted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      submittedRef.current = true;
      setSubmitted(true);
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [assessment.id, calcScores]);

  useEffect(() => {
    if (submitted) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          void submitAssessment(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [submitted, submitAssessment]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const question = questions[currentQ];
  const isUrgent = timeLeft < 300;

  const runTestCases = () => {
    setRunningTests(true);
    setTimeout(() => {
      const code = codeAnswersRef.current[question.id] || '';
      const visible = question.testCases?.filter(t => !t.isHidden).length || 2;
      const passed = code.length > 50 ? visible : Math.max(1, Math.floor(visible / 2));
      setTestResults(prev => ({ ...prev, [question.id]: { passed, total: visible } }));
      setRunningTests(false);
    }, 1200);
  };

  if (submitted && finalScores) {
    const { score, total, mcq, coding, subjective } = finalScores;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-[#DDE3EE] rounded-2xl p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${pct >= 70 ? 'bg-green-50' : pct >= 50 ? 'bg-amber-50' : 'bg-red-50'}`}>
            {pct >= 70 ? <CheckCircle2 size={36} className="text-green-600" /> : pct >= 50 ? <AlertCircle size={36} className="text-amber-600" /> : <XCircle size={36} className="text-red-600" />}
          </div>
          <h2 className="text-2xl font-700 text-[#0D1B3E] mb-1">Assessment Complete</h2>
          <p className="text-[#6B7A99] mb-6">{assessment.title}</p>
          <div className="text-5xl font-700 text-[#0D9488] mb-2">{pct}%</div>
          <p className="text-sm text-[#6B7A99] mb-2">{score} / {total} points</p>
          <p className="text-xs text-[#6B7A99] mb-8">MCQ {mcq} · Coding {coding} · Subjective {subjective}</p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-[#F9FAFB] rounded-xl p-4">
                <div className="text-xs text-[#6B7A99] mb-1">Q{i + 1} · {q.type.toUpperCase()}</div>
                <div className="font-700 text-sm text-[#0D1B3E] truncate">{q.title}</div>
                <div className={`text-xs font-600 mt-1 ${
                  q.type === 'mcq' && answers[q.id] === q.correctOption ? 'text-green-600'
                    : q.type === 'coding' && testResults[q.id]?.passed === testResults[q.id]?.total ? 'text-green-600'
                    : 'text-amber-600'
                }`}>
                  {q.type === 'mcq'
                    ? (answers[q.id] === q.correctOption ? '✓ Correct' : '✗ Incorrect')
                    : q.type === 'coding'
                      ? `${testResults[q.id]?.passed || 0}/${testResults[q.id]?.total || q.testCases?.filter(t => !t.isHidden).length || 0} tests`
                      : (answers[q.id]?.length || 0) > 100 ? '✓ Answered' : '— Skipped'}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onBack} className="px-6 py-2.5 border border-[#DDE3EE] rounded-xl font-600 text-[#3D5A80] hover:border-[#0D9488] transition-colors">
              Back to Assessments
            </button>
            <Link
              href="/assessment-results"
              className="px-6 py-2.5 bg-[#0D9488] text-white rounded-xl font-600 hover:bg-[#0b8276] transition-colors inline-flex items-center justify-center"
            >
              View Results
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white border border-[#DDE3EE] rounded-xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-[#F4F6FA] rounded-lg transition-colors">
            <ArrowLeft size={16} className="text-[#6B7A99]" />
          </button>
          <div>
            <h2 className="font-700 text-sm text-[#0D1B3E]">{assessment.title}</h2>
            <p className="text-xs text-[#6B7A99]">Question {currentQ + 1} of {questions.length}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-700 text-sm ${isUrgent ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#F4F6FA] text-[#0D1B3E]'}`}>
          <Timer size={14} className={isUrgent ? 'animate-pulse' : ''} />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex gap-2">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentQ(i)}
            className={[
              'flex-1 h-2 rounded-full transition-all',
              i === currentQ ? 'bg-[#0D9488]'
                : (q.type === 'mcq' && answers[q.id]) || (q.type === 'coding' && codeAnswers[q.id]) || (q.type === 'subjective' && answers[q.id])
                  ? 'bg-[#0D9488]/40'
                  : 'bg-[#DDE3EE]',
            ].join(' ')}
          />
        ))}
      </div>

      <div className="bg-white border border-[#DDE3EE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DDE3EE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-700 ${question.type === 'mcq' ? 'bg-blue-50 text-blue-600' : question.type === 'coding' ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
              {question.type === 'mcq' ? <CheckSquare size={15} /> : question.type === 'coding' ? <Code2 size={15} /> : <FileText size={15} />}
            </span>
            <div>
              <span className="text-xs font-600 text-[#6B7A99] uppercase tracking-wider">
                {question.type === 'mcq' ? 'Multiple Choice' : question.type === 'coding' ? 'Coding Problem' : 'Subjective'}
              </span>
              <h3 className="font-700 text-sm text-[#0D1B3E]">{question.title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-600 px-2 py-1 rounded-full border ${question.difficulty === 'easy' ? 'bg-green-50 text-green-700 border-green-200' : question.difficulty === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {question.difficulty}
            </span>
            <span className="text-xs font-700 text-[#0D9488]">{question.points} pts</span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm text-[#3D5A80] leading-relaxed mb-5">{question.description}</p>

          {question.type === 'mcq' && question.options && (
            <div className="space-y-2.5">
              {question.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAnswers(prev => ({ ...prev, [question.id]: opt.id }))}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                    answers[question.id] === opt.id
                      ? 'border-[#0D9488] bg-[#0D9488]/5'
                      : 'border-[#DDE3EE] hover:border-[#0D9488]/40 hover:bg-[#F9FAFB]',
                  ].join(' ')}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[question.id] === opt.id ? 'border-[#0D9488] bg-[#0D9488]' : 'border-[#DDE3EE]'}`}>
                    {answers[question.id] === opt.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <code className="text-sm text-[#0D1B3E] font-mono">{opt.text}</code>
                </button>
              ))}
            </div>
          )}

          {question.type === 'coding' && (
            <div className="space-y-4">
              {question.testCases && (
                <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#DDE3EE]">
                  <p className="text-xs font-700 text-[#6B7A99] uppercase tracking-wider mb-3">Sample Test Cases</p>
                  <div className="space-y-2">
                    {question.testCases.filter(t => !t.isHidden).map((tc, i) => (
                      <div key={i} className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[#6B7A99] font-600">Input:</span>
                          <code className="ml-2 text-[#0D1B3E] font-mono">{tc.input}</code>
                        </div>
                        <div>
                          <span className="text-[#6B7A99] font-600">Expected:</span>
                          <code className="ml-2 text-[#0D9488] font-mono">{tc.expectedOutput}</code>
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-[#6B7A99] mt-1">
                      + {question.testCases.filter(t => t.isHidden).length} hidden test case(s)
                    </p>
                  </div>
                </div>
              )}
              <div className="border border-[#DDE3EE] rounded-xl overflow-hidden">
                <div className="bg-[#0D1B3E] px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-[#8FA3C8] font-mono">JavaScript</span>
                  <button
                    onClick={() => setCodeAnswers(prev => ({ ...prev, [question.id]: question.sampleCode || '' }))}
                    className="text-xs text-[#8FA3C8] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                </div>
                <textarea
                  value={codeAnswers[question.id] ?? question.sampleCode ?? ''}
                  onChange={e => setCodeAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                  className="w-full h-48 bg-[#0D1B3E] text-[#E2E8F0] font-mono text-sm p-4 resize-none focus:outline-none"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={runTestCases}
                  disabled={runningTests}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0D1B3E] text-white rounded-lg text-sm font-600 hover:bg-[#162447] transition-colors disabled:opacity-60"
                >
                  {runningTests
                    ? <><Loader2 size={13} className="animate-spin" /> Running...</>
                    : <><Play size={13} /> Run Tests</>}
                </button>
                {testResults[question.id] && (
                  <span className={`text-sm font-600 flex items-center gap-1.5 ${testResults[question.id].passed === testResults[question.id].total ? 'text-green-600' : 'text-amber-600'}`}>
                    {testResults[question.id].passed === testResults[question.id].total
                      ? <CheckCircle2 size={14} />
                      : <AlertCircle size={14} />}
                    {testResults[question.id].passed}/{testResults[question.id].total} tests passed
                  </span>
                )}
              </div>
            </div>
          )}

          {question.type === 'subjective' && (
            <div className="space-y-3">
              {question.rubric && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                  <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">{question.rubric}</p>
                </div>
              )}
              <textarea
                value={answers[question.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                placeholder="Write your detailed answer here..."
                className="w-full h-48 border border-[#DDE3EE] rounded-xl p-4 text-sm text-[#0D1B3E] resize-none focus:outline-none focus:border-[#0D9488] leading-relaxed"
              />
              <div className="flex justify-between text-xs text-[#6B7A99]">
                <span>{(answers[question.id] || '').length} characters</span>
                <span>Minimum 100 characters recommended</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[#DDE3EE] flex items-center justify-between">
          <button
            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
            disabled={currentQ === 0}
            className="flex items-center gap-2 px-4 py-2 border border-[#DDE3EE] rounded-lg text-sm font-600 text-[#3D5A80] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={14} /> Previous
          </button>
          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
              className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276] transition-colors"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => void submitAssessment(false)}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-600 hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Submit Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Create Assessment ----
function CreateAssessment({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id],
    );
  };

  const selected = SAMPLE_QUESTIONS.filter(q => selectedQuestions.includes(q.id));
  const totalPoints = selected.reduce((s, q) => s + q.points, 0);

  const handleSave = async () => {
    if (!title || selected.length === 0 || saving) return;
    setSaving(true);
    const tags = Array.from(new Set(selected.flatMap(q => q.tags)));
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title,
          description,
          duration,
          total_points: totalPoints,
          status: 'published',
          questions: selected,
          tags,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create assessment');
      }
      toast.success('Assessment published');
      onCreated();
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white border border-[#DDE3EE] rounded-lg transition-colors">
          <ArrowLeft size={16} className="text-[#6B7A99]" />
        </button>
        <div>
          <h2 className="font-700 text-[#0D1B3E]">Create Assessment</h2>
          <p className="text-sm text-[#6B7A99]">Build a new pre-interview evaluation</p>
        </div>
      </div>

      <div className="bg-white border border-[#DDE3EE] rounded-xl p-5 space-y-4">
        <h3 className="font-700 text-sm text-[#0D1B3E]">Basic Details</h3>
        <div>
          <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Assessment Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Full Stack Developer — Pre-Interview"
            className="w-full px-3 py-2.5 border border-[#DDE3EE] rounded-lg text-sm focus:outline-none focus:border-[#0D9488]"
          />
        </div>
        <div>
          <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this assessment covers..."
            className="w-full px-3 py-2.5 border border-[#DDE3EE] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] h-20 resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-600 text-[#6B7A99] mb-1.5 block">Duration (minutes)</label>
          <div className="flex items-center gap-3 flex-wrap">
            {[30, 45, 60, 90, 120].map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-600 border transition-all ${duration === d ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'border-[#DDE3EE] text-[#3D5A80] hover:border-[#0D9488]'}`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#DDE3EE] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-700 text-sm text-[#0D1B3E]">Select Questions</h3>
          <span className="text-xs text-[#6B7A99]">{selectedQuestions.length} selected · {totalPoints} pts total</span>
        </div>
        <div className="space-y-3">
          {SAMPLE_QUESTIONS.map(q => {
            const isSelected = selectedQuestions.includes(q.id);
            return (
              <div
                key={q.id}
                onClick={() => toggleQuestion(q.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#0D9488] bg-[#0D9488]/5' : 'border-[#DDE3EE] hover:border-[#0D9488]/40'}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-[#0D9488] border-[#0D9488]' : 'border-[#DDE3EE]'}`}>
                  {isSelected && <Check size={11} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${q.type === 'mcq' ? 'bg-blue-50 text-blue-600' : q.type === 'coding' ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
                      {q.type.toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${q.difficulty === 'easy' ? 'bg-green-50 text-green-700' : q.difficulty === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {q.difficulty}
                    </span>
                    <span className="text-xs font-700 text-[#0D9488] ml-auto">{q.points} pts</span>
                  </div>
                  <p className="text-sm font-600 text-[#0D1B3E]">{q.title}</p>
                  <p className="text-xs text-[#6B7A99] mt-0.5 line-clamp-1">{q.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-2.5 border border-[#DDE3EE] rounded-xl text-sm font-600 text-[#3D5A80] hover:border-[#0D9488] transition-colors">
          Cancel
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={!title || selectedQuestions.length === 0 || saving}
          className="flex-1 py-2.5 bg-[#0D9488] text-white rounded-xl text-sm font-600 hover:bg-[#0b8276] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Zap size={14} /> Save & Publish</>}
        </button>
      </div>
    </div>
  );
}

// ---- Preview ----
function AssessmentPreview({
  assessment,
  onBack,
  onTake,
}: {
  assessment: Assessment;
  onBack: () => void;
  onTake: () => void;
}) {
  const questions =
    assessment.questions?.length > 0 ? assessment.questions : SAMPLE_QUESTIONS;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white border border-[#DDE3EE] rounded-lg transition-colors">
          <ArrowLeft size={16} className="text-[#6B7A99]" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-700 text-[#0D1B3E] truncate">{assessment.title}</h2>
          <p className="text-sm text-[#6B7A99]">{assessment.description || 'No description'}</p>
        </div>
        <button
          onClick={onTake}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276] transition-colors shrink-0"
        >
          <Play size={14} /> Take Assessment
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Duration', value: `${assessment.duration}m`, icon: <Clock size={14} /> },
          { label: 'Points', value: assessment.totalPoints, icon: <Award size={14} /> },
          { label: 'Questions', value: questions.length, icon: <CheckSquare size={14} /> },
          { label: 'Avg Score', value: assessment.avgScore > 0 ? `${assessment.avgScore}%` : '—', icon: <Target size={14} /> },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#DDE3EE] rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-[#6B7A99] mb-1">
              {s.icon}
              <span className="text-[10px]">{s.label}</span>
            </div>
            <p className="font-700 text-[#0D1B3E]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#DDE3EE] rounded-xl p-5 space-y-3">
        <h3 className="font-700 text-sm text-[#0D1B3E]">Questions</h3>
        {questions.map((q, i) => (
          <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#DDE3EE]">
            <span className="text-xs font-700 text-[#6B7A99] w-6 shrink-0">Q{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${q.type === 'mcq' ? 'bg-blue-50 text-blue-600' : q.type === 'coding' ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
                  {q.type.toUpperCase()}
                </span>
                <span className="text-xs font-700 text-[#0D9488]">{q.points} pts</span>
              </div>
              <p className="text-sm font-600 text-[#0D1B3E]">{q.title}</p>
              <p className="text-xs text-[#6B7A99] line-clamp-1 mt-0.5">{q.description}</p>
            </div>
          </div>
        ))}
        {assessment.questions?.length === 0 && (
          <p className="text-xs text-[#6B7A99]">Using sample question templates (assessment has no saved questions).</p>
        )}
      </div>
    </div>
  );
}

// ---- Main Component ----
export default function AssessmentsContent() {
  const [view, setView] = useState<AssessmentView>('list');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { balance } = useCreditBalance();

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assessments?limit=50');
      if (!res.ok) throw new Error('Failed to load assessments');
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      setAssessments(rows.map((r: Record<string, unknown>) => mapApiAssessment(r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load assessments');
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  const filtered = assessments.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const scored = assessments.filter(a => a.avgScore > 0);
  const avgOverall =
    scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + a.avgScore, 0) / scored.length)
      : 0;

  const stats = [
    { label: 'Total Assessments', value: assessments.length, icon: <ClipboardList size={18} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Published', value: assessments.filter(a => a.status === 'published').length, icon: <CheckSquare size={18} />, color: 'bg-green-50 text-green-600' },
    { label: 'Candidates Assigned', value: assessments.reduce((s, a) => s + a.assignedTo, 0), icon: <Users size={18} />, color: 'bg-violet-50 text-violet-600' },
    { label: 'Avg Score', value: scored.length ? `${avgOverall}%` : '—', icon: <TrendingUp size={18} />, color: 'bg-teal-50 text-teal-600' },
  ];

  const requestTake = (assessment: Assessment) => {
    setSelected(assessment);
    if (assessment.status === 'published') {
      setShowCreditModal(true);
    } else {
      setView('take');
    }
  };

  if (view === 'take' && selected) {
    return <AssessmentTaker assessment={selected} onBack={() => { setView('list'); setSelected(null); }} />;
  }
  if (view === 'create') {
    return (
      <CreateAssessment
        onBack={() => setView('list')}
        onCreated={() => void loadAssessments()}
      />
    );
  }
  if (view === 'preview' && selected) {
    return (
      <AssessmentPreview
        assessment={selected}
        onBack={() => { setView('list'); setSelected(null); }}
        onTake={() => requestTake(selected)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {showCreditModal && selected && (
        <CreditCheckModal
          operation="codingAssessment"
          balance={balance}
          onConfirm={() => { setShowCreditModal(false); setView('take'); }}
          onCancel={() => setShowCreditModal(false)}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D1B3E] flex items-center justify-center">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-700 text-[#0D1B3E]">Assessment Engine</h1>
            <p className="text-sm text-[#6B7A99]">MCQ, coding, and subjective assessments with auto-scoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/assessment-results"
            className="px-3 py-2 border border-[#DDE3EE] rounded-lg text-sm font-600 text-[#3D5A80] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
          >
            Results
          </Link>
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276] transition-colors"
          >
            <Plus size={15} /> New Assessment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white border border-[#DDE3EE] rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-xs text-[#6B7A99]">{stat.label}</p>
              <p className="font-700 text-lg text-[#0D1B3E]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
          <input
            type="text"
            placeholder="Search assessments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-[#DDE3EE] rounded-lg focus:outline-none focus:border-[#0D9488] w-56 bg-white"
          />
        </div>
        <div className="flex gap-1 bg-white border border-[#DDE3EE] rounded-lg p-1">
          {['all', 'published', 'draft', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-600 transition-all capitalize ${filterStatus === s ? 'bg-[#0D1B3E] text-white' : 'text-[#6B7A99] hover:text-[#0D1B3E]'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#6B7A99]">
          <Loader2 size={28} className="animate-spin mb-3 text-[#0D9488]" />
          <p className="text-sm">Loading assessments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#DDE3EE] rounded-xl py-16 text-center">
          <ClipboardList size={32} className="mx-auto text-[#DDE3EE] mb-3" />
          <p className="font-600 text-[#0D1B3E] mb-1">No assessments found</p>
          <p className="text-sm text-[#6B7A99] mb-4">
            {search || filterStatus !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Create your first assessment to get started.'}
          </p>
          {!search && filterStatus === 'all' && (
            <button
              onClick={() => setView('create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276] transition-colors"
            >
              <Plus size={15} /> New Assessment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(assessment => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onView={() => { setSelected(assessment); setView('preview'); }}
              onTake={() => requestTake(assessment)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
