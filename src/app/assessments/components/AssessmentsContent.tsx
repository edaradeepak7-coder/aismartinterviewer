'use client';
import React, { useState, useEffect, useRef, useReducer } from 'react';
import { ClipboardList, Plus, Play, Clock, Code2, FileText, CheckSquare, Search, Eye, Users, Timer, Award, Target, TrendingUp, Check, AlertCircle, Zap, ArrowLeft, ArrowRight, Send, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useCreditBalance } from '@/lib/hooks/useCreditBalance';
import CreditCheckModal from '@/components/CreditCheckModal';

type QuestionType = 'mcq' | 'coding' | 'subjective';
type AssessmentView = 'list' | 'create' | 'take' | 'results';

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

const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: 'a1',
    title: 'Full Stack Developer — Pre-Interview',
    description: 'Covers React, Node.js, databases, and system design fundamentals',
    duration: 90,
    totalPoints: 150,
    questions: [],
    status: 'published',
    assignedTo: 48,
    completions: 31,
    avgScore: 72,
    createdAt: '2026-08-20',
    tags: ['React', 'Node.js', 'SQL'],
  },
  {
    id: 'a2',
    title: 'Data Structures & Algorithms Screening',
    description: 'Arrays, trees, graphs, dynamic programming — 3 coding problems',
    duration: 60,
    totalPoints: 100,
    questions: [],
    status: 'published',
    assignedTo: 62,
    completions: 55,
    avgScore: 58,
    createdAt: '2026-08-15',
    tags: ['DSA', 'Algorithms'],
  },
  {
    id: 'a3',
    title: 'Product Manager Aptitude Test',
    description: 'Logical reasoning, case analysis, and product thinking questions',
    duration: 45,
    totalPoints: 80,
    questions: [],
    status: 'draft',
    assignedTo: 0,
    completions: 0,
    avgScore: 0,
    createdAt: '2026-09-01',
    tags: ['Product', 'Aptitude'],
  },
];

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

// ---- Assessment Card ----
function AssessmentCard({ assessment, onView, onTake }: { assessment: Assessment; onView: () => void; onTake: () => void }) {
  const statusColors: Record<string, string> = {
    published: 'bg-green-50 text-green-700 border-green-200',
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    closed: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  const completionRate = assessment.assignedTo > 0 ? Math.round((assessment.completions / assessment.assignedTo) * 100) : 0;

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
          <Play size={12} /> Preview
        </button>
      </div>
    </div>
  );
}

// ---- Assessment Taker ----
function AssessmentTaker({ onBack }: { onBack: () => void }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(90 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { passed: number; total: number }>>({});
  const [runningTests, setRunningTests] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (submitted) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [submitted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const question = SAMPLE_QUESTIONS[currentQ];
  const isUrgent = timeLeft < 300;

  const runTestCases = () => {
    setRunningTests(true);
    setTimeout(() => {
      const code = codeAnswers[question.id] || '';
      const passed = code.length > 50 ? 2 : 1;
      setTestResults(prev => ({ ...prev, [question.id]: { passed, total: question.testCases?.filter(t => !t.isHidden).length || 2 } }));
      setRunningTests(false);
    }, 1500);
  };

  const handleSubmit = () => {
    clearInterval(intervalRef.current!);
    setSubmitted(true);
  };

  const calcScore = () => {
    let score = 0;
    SAMPLE_QUESTIONS.forEach(q => {
      if (q.type === 'mcq' && answers[q.id] === q.correctOption) score += q.points;
      if (q.type === 'coding' && testResults[q.id]) score += Math.round((testResults[q.id].passed / testResults[q.id].total) * q.points);
      if (q.type === 'subjective' && answers[q.id]?.length > 100) score += Math.round(q.points * 0.75);
    });
    return score;
  };

  if (submitted) {
    let score = calcScore();
    const total = SAMPLE_QUESTIONS.reduce((s, q) => s + q.points, 0);
    const pct = Math.round((score / total) * 100);
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-[#DDE3EE] rounded-2xl p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${pct >= 70 ? 'bg-green-50' : pct >= 50 ? 'bg-amber-50' : 'bg-red-50'}`}>
            {pct >= 70 ? <CheckCircle2 size={36} className="text-green-600" /> : pct >= 50 ? <AlertCircle size={36} className="text-amber-600" /> : <XCircle size={36} className="text-red-600" />}
          </div>
          <h2 className="text-2xl font-700 text-[#0D1B3E] mb-1">Assessment Complete</h2>
          <p className="text-[#6B7A99] mb-6">Full Stack Developer — Pre-Interview</p>
          <div className="text-5xl font-700 text-[#0D9488] mb-2">{pct}%</div>
          <p className="text-sm text-[#6B7A99] mb-8">{score} / {total} points</p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {SAMPLE_QUESTIONS.map((q, i) => (
              <div key={q.id} className="bg-[#F9FAFB] rounded-xl p-4">
                <div className="text-xs text-[#6B7A99] mb-1">Q{i + 1} · {q.type.toUpperCase()}</div>
                <div className="font-700 text-sm text-[#0D1B3E] truncate">{q.title}</div>
                <div className={`text-xs font-600 mt-1 ${q.type === 'mcq' && answers[q.id] === q.correctOption ? 'text-green-600' : q.type === 'coding' && testResults[q.id]?.passed === testResults[q.id]?.total ? 'text-green-600' : 'text-amber-600'}`}>
                  {q.type === 'mcq' ? (answers[q.id] === q.correctOption ? '✓ Correct' : '✗ Incorrect') :
                   q.type === 'coding' ? `${testResults[q.id]?.passed || 0}/${testResults[q.id]?.total || q.testCases?.filter(t => !t.isHidden).length || 0} tests` :
                   answers[q.id]?.length > 100 ? '✓ Answered' : '— Skipped'}
                </div>
              </div>
            ))}
          </div>
          <button onClick={onBack} className="px-6 py-2.5 bg-[#0D9488] text-white rounded-xl font-600 hover:bg-[#0b8276] transition-colors">
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white border border-[#DDE3EE] rounded-xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-[#F4F6FA] rounded-lg transition-colors">
            <ArrowLeft size={16} className="text-[#6B7A99]" />
          </button>
          <div>
            <h2 className="font-700 text-sm text-[#0D1B3E]">Full Stack Developer — Pre-Interview</h2>
            <p className="text-xs text-[#6B7A99]">Question {currentQ + 1} of {SAMPLE_QUESTIONS.length}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-700 text-sm ${isUrgent ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#F4F6FA] text-[#0D1B3E]'}`}>
          <Timer size={14} className={isUrgent ? 'animate-pulse' : ''} />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {SAMPLE_QUESTIONS.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentQ(i)}
            className={[
              'flex-1 h-2 rounded-full transition-all',
              i === currentQ ? 'bg-[#0D9488]' :
              (q.type === 'mcq' && answers[q.id]) || (q.type === 'coding' && codeAnswers[q.id]) || (q.type === 'subjective' && answers[q.id]) ? 'bg-[#0D9488]/40' :
              'bg-[#DDE3EE]',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Question */}
      <div className="bg-white border border-[#DDE3EE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DDE3EE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-700 ${question.type === 'mcq' ? 'bg-blue-50 text-blue-600' : question.type === 'coding' ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
              {question.type === 'mcq' ? <CheckSquare size={15} /> : question.type === 'coding' ? <Code2 size={15} /> : <FileText size={15} />}
            </span>
            <div>
              <span className="text-xs font-600 text-[#6B7A99] uppercase tracking-wider">{question.type === 'mcq' ? 'Multiple Choice' : question.type === 'coding' ? 'Coding Problem' : 'Subjective'}</span>
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

          {/* MCQ */}
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

          {/* Coding */}
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
                    <p className="text-[10px] text-[#6B7A99] mt-1">+ {question.testCases.filter(t => t.isHidden).length} hidden test case(s)</p>
                  </div>
                </div>
              )}
              <div className="border border-[#DDE3EE] rounded-xl overflow-hidden">
                <div className="bg-[#0D1B3E] px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-[#8FA3C8] font-mono">JavaScript</span>
                  <button onClick={() => setCodeAnswers(prev => ({ ...prev, [question.id]: question.sampleCode || '' }))} className="text-xs text-[#8FA3C8] hover:text-white transition-colors flex items-center gap-1">
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
                  {runningTests ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running...</> : <><Play size={13} /> Run Tests</>}
                </button>
                {testResults[question.id] && (
                  <span className={`text-sm font-600 flex items-center gap-1.5 ${testResults[question.id].passed === testResults[question.id].total ? 'text-green-600' : 'text-amber-600'}`}>
                    {testResults[question.id].passed === testResults[question.id].total ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {testResults[question.id].passed}/{testResults[question.id].total} tests passed
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Subjective */}
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
          {currentQ < SAMPLE_QUESTIONS.length - 1 ? (
            <button
              onClick={() => setCurrentQ(prev => Math.min(SAMPLE_QUESTIONS.length - 1, prev + 1))}
              className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276] transition-colors"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-600 hover:bg-green-700 transition-colors"
            >
              <Send size={14} /> Submit Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Create Assessment ----
function CreateAssessment({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]);
  };

  const totalPoints = SAMPLE_QUESTIONS.filter(q => selectedQuestions.includes(q.id)).reduce((s, q) => s + q.points, 0);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onBack(); }, 1500);
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
          <div className="flex items-center gap-3">
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
            const selected = selectedQuestions.includes(q.id);
            return (
              <div
                key={q.id}
                onClick={() => toggleQuestion(q.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-[#0D9488] bg-[#0D9488]/5' : 'border-[#DDE3EE] hover:border-[#0D9488]/40'}`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? 'bg-[#0D9488] border-[#0D9488]' : 'border-[#DDE3EE]'}`}>
                  {selected && <Check size={11} className="text-white" />}
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
          onClick={handleSave}
          disabled={!title || selectedQuestions.length === 0}
          className="flex-1 py-2.5 bg-[#0D9488] text-white rounded-xl text-sm font-600 hover:bg-[#0b8276] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saved ? <><Check size={14} /> Saved!</> : <><Zap size={14} /> Save & Publish</>}
        </button>
      </div>
    </div>
  );
}

// ---- Main Component ----
export default function AssessmentsContent() {
  const [view, setView] = useState<AssessmentView>('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { balance } = useCreditBalance();

  const filtered = MOCK_ASSESSMENTS.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Total Assessments', value: MOCK_ASSESSMENTS.length, icon: <ClipboardList size={18} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Published', value: MOCK_ASSESSMENTS.filter(a => a.status === 'published').length, icon: <CheckSquare size={18} />, color: 'bg-green-50 text-green-600' },
    { label: 'Candidates Assigned', value: MOCK_ASSESSMENTS.reduce((s, a) => s + a.assignedTo, 0), icon: <Users size={18} />, color: 'bg-violet-50 text-violet-600' },
    { label: 'Avg Score', value: `${Math.round(MOCK_ASSESSMENTS.filter(a => a.avgScore > 0).reduce((s, a) => s + a.avgScore, 0) / 2)}%`, icon: <TrendingUp size={18} />, color: 'bg-teal-50 text-teal-600' },
  ];

  if (view === 'take') return <AssessmentTaker onBack={() => setView('list')} />;
  if (view === 'create') return <CreateAssessment onBack={() => setView('list')} />;

  return (
    <div className="space-y-6">
      {showCreditModal && (
        <CreditCheckModal
          operation="codingAssessment"
          balance={balance}
          onConfirm={() => { setShowCreditModal(false); setView('take'); }}
          onCancel={() => setShowCreditModal(false)}
        />
      )}
      {/* Header */}
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
        <button
          onClick={() => setView('create')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276] transition-colors"
        >
          <Plus size={15} /> New Assessment
        </button>
      </div>

      {/* Stats */}
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

      {/* Filters */}
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

      {/* Assessment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(assessment => (
          <AssessmentCard
            key={assessment.id}
            assessment={assessment}
            onView={() => setView('results')}
            onTake={() => setShowCreditModal(true)}
          />
        ))}
      </div>
    </div>
  );
}
