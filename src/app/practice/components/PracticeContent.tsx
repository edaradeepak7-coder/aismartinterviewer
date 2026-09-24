'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { FlaskConical, BookOpen, Mic, ChevronRight, Clock, CheckCircle2, Zap, FileText, Layers, Trophy, Lock, BarChart2, ArrowLeft, Filter, RefreshCw, Database, Coffee, Atom, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { saveInterviewSessionConfig } from '@/lib/interview/sessionConfig';

type Tab = 'subjects' | 'mcq' | 'mock';
type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface Lesson {
  id: string;
  title: string;
  duration: number;
  questions: number;
  completed: boolean;
  locked: boolean;
  difficulty: Difficulty;
  attempts: number;
  bestScore: number;
}

interface Subject {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  accent: string;
  lessons: Lesson[];
  progress: number;
  totalQuestions: number;
  description: string;
}

interface MCQQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: Difficulty;
  subject: string;
}

interface QuizAttempt {
  lessonId: string;
  score: number;
  total: number;
  timestamp: number;
  timeSpent: number;
}

/** Static curriculum catalog — progress fields are overwritten from persisted attempts. */
const SUBJECT_CATALOG: Subject[] = [
  {
    id: 'java', name: 'Java', icon: <Coffee size={18} />, color: 'text-orange-600',
    bg: 'bg-orange-50', border: 'border-orange-200', accent: '#ea580c',
    progress: 0, totalQuestions: 80, description: 'Core Java, OOP, Collections, Multithreading & JVM internals',
    lessons: [
      { id: 'j1', title: 'OOP Fundamentals', duration: 20, questions: 15, completed: false, locked: false, difficulty: 'Easy', attempts: 0, bestScore: 0 },
      { id: 'j2', title: 'Collections Framework', duration: 25, questions: 18, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
      { id: 'j3', title: 'Exception Handling', duration: 20, questions: 12, completed: false, locked: true, difficulty: 'Easy', attempts: 0, bestScore: 0 },
      { id: 'j4', title: 'Multithreading & Concurrency', duration: 35, questions: 20, completed: false, locked: true, difficulty: 'Hard', attempts: 0, bestScore: 0 },
      { id: 'j5', title: 'Java 8+ Features (Streams, Lambdas)', duration: 30, questions: 15, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
    ],
  },
  {
    id: 'python', name: 'Python', icon: <Zap size={18} />, color: 'text-blue-600',
    bg: 'bg-blue-50', border: 'border-blue-200', accent: '#2563eb',
    progress: 0, totalQuestions: 70, description: 'Python basics, data structures, decorators, async & frameworks',
    lessons: [
      { id: 'py1', title: 'Python Basics & Data Types', duration: 15, questions: 12, completed: false, locked: false, difficulty: 'Easy', attempts: 0, bestScore: 0 },
      { id: 'py2', title: 'List Comprehensions & Generators', duration: 20, questions: 10, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
      { id: 'py3', title: 'Decorators & Context Managers', duration: 25, questions: 12, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
      { id: 'py4', title: 'Async/Await & Concurrency', duration: 30, questions: 15, completed: false, locked: true, difficulty: 'Hard', attempts: 0, bestScore: 0 },
      { id: 'py5', title: 'OOP in Python', duration: 20, questions: 12, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
    ],
  },
  {
    id: 'react', name: 'React', icon: <Atom size={18} />, color: 'text-cyan-600',
    bg: 'bg-cyan-50', border: 'border-cyan-200', accent: '#0891b2',
    progress: 0, totalQuestions: 65, description: 'React hooks, state management, performance & advanced patterns',
    lessons: [
      { id: 'r1', title: 'Hooks Deep Dive (useState, useEffect)', duration: 20, questions: 15, completed: false, locked: false, difficulty: 'Easy', attempts: 0, bestScore: 0 },
      { id: 'r2', title: 'Context API & useReducer', duration: 25, questions: 12, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
      { id: 'r3', title: 'Performance Optimization (memo, useMemo)', duration: 25, questions: 14, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
      { id: 'r4', title: 'Custom Hooks & Patterns', duration: 30, questions: 12, completed: false, locked: true, difficulty: 'Hard', attempts: 0, bestScore: 0 },
      { id: 'r5', title: 'React 18 Concurrent Features', duration: 35, questions: 12, completed: false, locked: true, difficulty: 'Hard', attempts: 0, bestScore: 0 },
    ],
  },
  {
    id: 'sql', name: 'SQL', icon: <Database size={18} />, color: 'text-violet-600',
    bg: 'bg-violet-50', border: 'border-violet-200', accent: '#7c3aed',
    progress: 0, totalQuestions: 60, description: 'SQL queries, joins, indexing, transactions & query optimization',
    lessons: [
      { id: 'sq1', title: 'SELECT, WHERE & Filtering', duration: 15, questions: 12, completed: false, locked: false, difficulty: 'Easy', attempts: 0, bestScore: 0 },
      { id: 'sq2', title: 'JOINs (INNER, LEFT, RIGHT, FULL)', duration: 25, questions: 15, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
      { id: 'sq3', title: 'Aggregations & GROUP BY', duration: 20, questions: 12, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
      { id: 'sq4', title: 'Subqueries & CTEs', duration: 30, questions: 14, completed: false, locked: true, difficulty: 'Hard', attempts: 0, bestScore: 0 },
      { id: 'sq5', title: 'Indexes & Query Optimization', duration: 35, questions: 12, completed: false, locked: true, difficulty: 'Hard', attempts: 0, bestScore: 0 },
    ],
  },
  {
    id: 'dsa', name: 'DSA', icon: <Layers size={18} />, color: 'text-emerald-600',
    bg: 'bg-emerald-50', border: 'border-emerald-200', accent: '#059669',
    progress: 0, totalQuestions: 90, description: 'Data structures, algorithms, complexity analysis & problem solving',
    lessons: [
      { id: 'd1', title: 'Arrays & Hashing', duration: 20, questions: 18, completed: false, locked: false, difficulty: 'Easy', attempts: 0, bestScore: 0 },
      { id: 'd2', title: 'Linked Lists & Stacks', duration: 25, questions: 15, completed: false, locked: true, difficulty: 'Easy', attempts: 0, bestScore: 0 },
      { id: 'd3', title: 'Trees & Binary Search Trees', duration: 30, questions: 18, completed: false, locked: true, difficulty: 'Medium', attempts: 0, bestScore: 0 },
      { id: 'd4', title: 'Dynamic Programming', duration: 40, questions: 20, completed: false, locked: true, difficulty: 'Hard', attempts: 0, bestScore: 0 },
      { id: 'd5', title: 'Graphs & BFS/DFS', duration: 35, questions: 19, completed: false, locked: true, difficulty: 'Hard', attempts: 0, bestScore: 0 },
    ],
  },
];

const DIFF_COLORS: Record<Difficulty, string> = {
  Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Hard: 'bg-red-50 text-red-700 border-red-200',
};

const PRACTICE_STORAGE_KEY = 'practice_hub_v1';

const INTERVIEW_PRESETS = [
  { id: 'mi1', role: 'Frontend Engineer', company: 'FAANG-style', duration: 45 as const, type: 'Technical', difficulty: 'Hard' as Difficulty, questions: 12 },
  { id: 'mi2', role: 'Full Stack Developer', company: 'Startup', duration: 30 as const, type: 'Technical + Behavioral', difficulty: 'Medium' as Difficulty, questions: 8 },
  { id: 'mi3', role: 'Software Engineer', company: 'Mid-size Tech', duration: 60 as const, type: 'System Design', difficulty: 'Hard' as Difficulty, questions: 16 },
  { id: 'mi4', role: 'Junior Developer', company: 'General', duration: 20 as const, type: 'Behavioral', difficulty: 'Easy' as Difficulty, questions: 5 },
];

type LessonProgress = Record<string, { attempts: number; bestScore: number; completed: boolean }>;

const EMPTY_ANALYTICS: Analytics = {
  totalAttempts: 0,
  correctAnswers: 0,
  avgTime: 0,
  byDifficulty: {
    Easy: { correct: 0, total: 0 },
    Medium: { correct: 0, total: 0 },
    Hard: { correct: 0, total: 0 },
  },
  bySubject: {},
  recentAttempts: [],
};

function loadPracticeState(): { analytics: Analytics; lessonProgress: LessonProgress } {
  if (typeof window === 'undefined') return { analytics: EMPTY_ANALYTICS, lessonProgress: {} };
  try {
    const raw = localStorage.getItem(PRACTICE_STORAGE_KEY);
    if (!raw) return { analytics: EMPTY_ANALYTICS, lessonProgress: {} };
    const parsed = JSON.parse(raw);
    return {
      analytics: { ...EMPTY_ANALYTICS, ...(parsed.analytics || {}), byDifficulty: { ...EMPTY_ANALYTICS.byDifficulty, ...(parsed.analytics?.byDifficulty || {}) } },
      lessonProgress: parsed.lessonProgress || {},
    };
  } catch {
    return { analytics: EMPTY_ANALYTICS, lessonProgress: {} };
  }
}

function savePracticeState(analytics: Analytics, lessonProgress: LessonProgress) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify({ analytics, lessonProgress }));
  } catch { /* ignore */ }
}

function applyLessonProgress(catalog: Subject[], progress: LessonProgress): Subject[] {
  return catalog.map((sub) => {
    const lessons = sub.lessons.map((lesson, i) => {
      const p = progress[lesson.id];
      const prevDone = i === 0 || !!progress[sub.lessons[i - 1].id]?.completed;
      return {
        ...lesson,
        attempts: p?.attempts || 0,
        bestScore: p?.bestScore || 0,
        completed: !!p?.completed,
        locked: i > 0 && !prevDone,
      };
    });
    const completedCount = lessons.filter((l) => l.completed).length;
    return {
      ...sub,
      lessons,
      progress: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0,
    };
  });
}

function computeStreakDays(attempts: QuizAttempt[]): number {
  if (!attempts.length) return 0;
  const days = new Set(attempts.map((a) => new Date(a.timestamp).toDateString()));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    if (!days.has(cursor.toDateString())) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  // Allow streak to start from yesterday if no activity today yet
  if (streak === 0) {
    cursor.setTime(Date.now());
    cursor.setDate(cursor.getDate() - 1);
    if (days.has(cursor.toDateString())) {
      for (;;) {
        if (!days.has(cursor.toDateString())) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }
  }
  return streak;
}

// Per-subject MCQ banks
const MCQ_BANK: Record<string, MCQQuestion[]> = {
  java: [
    { q: 'Which keyword is used to prevent method overriding in Java?', options: ['static', 'final', 'abstract', 'private'], answer: 1, explanation: 'final prevents a method from being overridden in subclasses.', difficulty: 'Easy', subject: 'Java' },
    { q: 'What is the output of Integer.parseInt("10") + 5?', options: ['105', '15', 'Error', '"105"'], answer: 1, explanation: 'parseInt converts "10" to int 10, then 10+5=15.', difficulty: 'Easy', subject: 'Java' },
    { q: 'Which collection allows duplicate keys?', options: ['HashMap', 'TreeMap', 'LinkedHashMap', 'None of these'], answer: 3, explanation: 'Map implementations do not allow duplicate keys.', difficulty: 'Medium', subject: 'Java' },
    { q: 'What does volatile keyword guarantee in Java?', options: ['Atomicity', 'Visibility', 'Synchronization', 'Immutability'], answer: 1, explanation: 'volatile ensures visibility of changes across threads.', difficulty: 'Hard', subject: 'Java' },
    { q: 'Which interface must be implemented for lambda expressions?', options: ['Runnable', 'Callable', 'Functional Interface', 'Comparable'], answer: 2, explanation: 'Lambda expressions implement functional interfaces (single abstract method).', difficulty: 'Medium', subject: 'Java' },
  ],
  python: [
    { q: 'What is the output of type([])?', options: ['list', '<class list>', "<class 'list'>", 'array'], answer: 2, explanation: "type([]) returns <class 'list'>.", difficulty: 'Easy', subject: 'Python' },
    { q: 'Which is NOT a valid Python data type?', options: ['tuple', 'frozenset', 'array', 'dict'], answer: 2, explanation: 'array is not a built-in Python type (it is in the array module).', difficulty: 'Easy', subject: 'Python' },
    { q: 'What does @staticmethod decorator do?', options: ['Binds to class', 'No binding to class or instance', 'Makes method private', 'Caches result'], answer: 1, explanation: 'staticmethod creates a method with no implicit first argument.', difficulty: 'Medium', subject: 'Python' },
    { q: 'What is a generator in Python?', options: ['A class', 'A function using yield', 'A list comprehension', 'A decorator'], answer: 1, explanation: 'Generators use yield to lazily produce values.', difficulty: 'Medium', subject: 'Python' },
    { q: 'What does GIL stand for in Python?', options: ['Global Instance Lock', 'Global Interpreter Lock', 'General Import Library', 'Generic Interface Layer'], answer: 1, explanation: 'GIL = Global Interpreter Lock, prevents true multi-threading in CPython.', difficulty: 'Hard', subject: 'Python' },
  ],
  react: [
    { q: 'Which hook replaces componentDidMount?', options: ['useState', 'useEffect', 'useRef', 'useCallback'], answer: 1, explanation: 'useEffect with empty deps array runs once after mount.', difficulty: 'Easy', subject: 'React' },
    { q: 'What does React.memo do?', options: ['Memoizes state', 'Prevents re-render if props unchanged', 'Caches API calls', 'Stores refs'], answer: 1, explanation: 'React.memo is a HOC that skips re-rendering if props are the same.', difficulty: 'Easy', subject: 'React' },
    { q: 'When does useCallback return a new function?', options: ['Every render', 'When dependencies change', 'Never', 'On mount only'], answer: 1, explanation: 'useCallback returns a memoized callback that only changes when deps change.', difficulty: 'Medium', subject: 'React' },
    { q: 'What is the purpose of useRef?', options: ['Trigger re-renders', 'Persist mutable values without re-render', 'Manage context', 'Handle side effects'], answer: 1, explanation: 'useRef persists a mutable value across renders without causing re-renders.', difficulty: 'Medium', subject: 'React' },
    { q: 'What is React Suspense used for?', options: ['Error handling', 'Lazy loading & async rendering', 'State management', 'Event handling'], answer: 1, explanation: 'Suspense lets components wait for something (lazy load, data) before rendering.', difficulty: 'Hard', subject: 'React' },
  ],
  sql: [
    { q: 'Which JOIN returns all rows from both tables?', options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'], answer: 3, explanation: 'FULL OUTER JOIN returns all rows from both tables.', difficulty: 'Easy', subject: 'SQL' },
    { q: 'What does GROUP BY do?', options: ['Sorts results', 'Groups rows with same values', 'Filters rows', 'Joins tables'], answer: 1, explanation: 'GROUP BY groups rows that have the same values into summary rows.', difficulty: 'Easy', subject: 'SQL' },
    { q: 'Which clause filters groups after GROUP BY?', options: ['WHERE', 'HAVING', 'FILTER', 'LIMIT'], answer: 1, explanation: 'HAVING filters groups, WHERE filters individual rows.', difficulty: 'Medium', subject: 'SQL' },
    { q: 'What is a CTE in SQL?', options: ['Common Table Expression', 'Computed Table Entry', 'Conditional Table Execution', 'Cached Table Entity'], answer: 0, explanation: 'CTE = Common Table Expression, a named temporary result set.', difficulty: 'Medium', subject: 'SQL' },
    { q: 'Which index type is best for range queries?', options: ['Hash index', 'B-tree index', 'Bitmap index', 'Full-text index'], answer: 1, explanation: 'B-tree indexes support range queries efficiently.', difficulty: 'Hard', subject: 'SQL' },
  ],
  dsa: [
    { q: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], answer: 1, explanation: 'Binary search halves the search space each step: O(log n).', difficulty: 'Easy', subject: 'DSA' },
    { q: 'Which data structure uses LIFO order?', options: ['Queue', 'Stack', 'Linked List', 'Heap'], answer: 1, explanation: 'Stack uses Last In, First Out (LIFO) order.', difficulty: 'Easy', subject: 'DSA' },
    { q: 'What is the worst-case time complexity of QuickSort?', options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], answer: 2, explanation: 'QuickSort worst case is O(n²) when pivot is always min/max.', difficulty: 'Medium', subject: 'DSA' },
    { q: 'Which algorithm finds shortest path in unweighted graph?', options: ['DFS', 'BFS', 'Dijkstra', 'Bellman-Ford'], answer: 1, explanation: 'BFS finds shortest path in unweighted graphs.', difficulty: 'Medium', subject: 'DSA' },
    { q: 'What is the space complexity of merge sort?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 2, explanation: 'Merge sort requires O(n) auxiliary space for merging.', difficulty: 'Hard', subject: 'DSA' },
  ],
};

// Analytics tracker
interface Analytics {
  totalAttempts: number;
  correctAnswers: number;
  avgTime: number; // seconds per question
  byDifficulty: Record<Difficulty, { correct: number; total: number }>;
  bySubject: Record<string, { correct: number; total: number }>;
  recentAttempts: QuizAttempt[];
}

function MCQQuiz({
  subjectId, lessonTitle, difficulty, onBack, onComplete
}: {
  subjectId: string;
  lessonTitle: string;
  difficulty: Difficulty;
  onBack: () => void;
  onComplete: (score: number, total: number, timeSpent: number) => void;
}) {
  const allQs = MCQ_BANK[subjectId] || MCQ_BANK.dsa;
  const questions = allQs.filter(q => difficulty === 'Easy' ? true : q.difficulty === difficulty || q.difficulty === 'Easy').slice(0, 5);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 min
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setTimeLeft(p => {
      if (p <= 1) { clearInterval(t); setSubmitted(true); return 0; }
      return p - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const correctCount = submitted
    ? questions.filter((q, i) => answers[i] === q.answer).length
    : 0;
  const score = submitted ? Math.round((correctCount / questions.length) * 100) : 0;

  if (submitted) {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#6B7A99] hover:text-[#0D1B3E] transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="bg-white border border-[#DDE3EE] rounded-2xl p-8 text-center">
          <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${score >= 80 ? 'bg-emerald-50 ring-4 ring-emerald-100' : score >= 60 ? 'bg-amber-50 ring-4 ring-amber-100' : 'bg-red-50 ring-4 ring-red-100'}`}>
            <span className={`text-3xl font-800 ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{score}%</span>
          </div>
          <h3 className="font-700 text-[#0D1B3E] text-lg mb-1">{score >= 80 ? '🎉 Excellent!' : score >= 60 ? '👍 Good Job!' : '💪 Keep Practicing!'}</h3>
          <p className="text-sm text-[#6B7A99] mb-1">{correctCount}/{questions.length} correct · {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</p>
          <div className="flex items-center justify-center gap-4 mb-6 text-xs text-[#6B7A99]">
            <span className="flex items-center gap-1"><Clock size={11} />{Math.round(timeSpent / questions.length)}s avg/question</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-600 ${DIFF_COLORS[difficulty]}`}>{difficulty}</span>
          </div>
          <div className="space-y-2 text-left max-w-lg mx-auto mb-6">
            {questions.map((q, i) => {
              const correct = answers[i] === q.answer;
              return (
                <div key={i} className={`p-3 rounded-xl border ${correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {correct ? <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" /> : <span className="text-red-500 text-sm mt-0.5 shrink-0">✗</span>}
                    <div>
                      <p className="text-xs font-600 text-[#0D1B3E]">{q.q}</p>
                      {!correct && <p className="text-[11px] text-red-500 mt-0.5">Correct: {q.options[q.answer]}</p>}
                      <p className="text-[11px] text-[#6B7A99] mt-0.5 italic">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={onBack} className="px-5 py-2 border border-[#DDE3EE] rounded-xl text-sm font-600 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors">
              Back to Lessons
            </button>
            <button onClick={() => { onComplete(score, questions.length, timeSpent); onBack(); }}
              className="px-5 py-2 bg-[#0D9488] text-white rounded-xl text-sm font-600 hover:bg-[#0b8276] transition-colors">
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-[#6B7A99] hover:text-[#0D1B3E] transition-colors flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6B7A99]">Q {current + 1}/{questions.length}</span>
          <span className={`flex items-center gap-1 text-xs font-700 px-2.5 py-1 rounded-lg ${timeLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-[#F4F6FA] text-[#3D5A80]'}`}>
            <Clock size={11} />{mins}:{secs}
          </span>
          <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</span>
        </div>
      </div>
      <div className="h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
        <div className="h-full bg-[#0D9488] rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="bg-white border border-[#DDE3EE] rounded-2xl p-5">
        <p className="text-sm font-600 text-[#0D1B3E] mb-4 leading-relaxed">{q.q}</p>
        <div className="space-y-2">
          {q.options.map((opt, oi) => (
            <button key={oi} onClick={() => setAnswers(prev => ({ ...prev, [current]: oi }))}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-500 transition-colors ${answers[current] === oi ? 'bg-[#0D9488]/10 border-[#0D9488] text-[#0D9488]' : 'border-[#DDE3EE] text-[#3D5A80] hover:border-[#0D9488]/40'}`}>
              <span className="font-700 mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-between">
        <button onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0}
          className="px-4 py-2 border border-[#DDE3EE] rounded-xl text-sm font-600 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] disabled:opacity-30 transition-colors">
          Previous
        </button>
        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent(p => p + 1)} disabled={answers[current] === undefined}
            className="px-4 py-2 bg-[#0D9488] text-white rounded-xl text-sm font-600 hover:bg-[#0b8276] disabled:opacity-50 transition-colors">
            Next
          </button>
        ) : (
          <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length}
            className="px-4 py-2 bg-[#0D9488] text-white rounded-xl text-sm font-600 hover:bg-[#0b8276] disabled:opacity-50 transition-colors">
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}

export default function PracticeContent() {
  const [tab, setTab] = useState<Tab>('subjects');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [quizLesson, setQuizLesson] = useState<{ subjectId: string; lessonId?: string; lessonTitle: string; difficulty: Difficulty } | null>(null);
  const [diffFilter, setDiffFilter] = useState<Difficulty | 'All'>('All');
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadPracticeState();
    setAnalytics(stored.analytics);
    setLessonProgress(stored.lessonProgress);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePracticeState(analytics, lessonProgress);
  }, [analytics, lessonProgress, hydrated]);

  const subjects = useMemo(() => applyLessonProgress(SUBJECT_CATALOG, lessonProgress), [lessonProgress]);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || null;
  const streakDays = useMemo(() => computeStreakDays(analytics.recentAttempts), [analytics.recentAttempts]);
  const accuracyPct = analytics.totalAttempts > 0
    ? Math.round((analytics.correctAnswers / Math.max(analytics.totalAttempts * 5, 1)) * 100)
    : 0;

  const handleQuizComplete = useCallback((score: number, total: number, timeSpent: number) => {
    if (!quizLesson) return;
    const correct = Math.round((score / 100) * total);
    const subjectName = SUBJECT_CATALOG.find((s) => s.id === quizLesson.subjectId)?.name || quizLesson.subjectId;

    setAnalytics((prev) => {
      const bySubject = { ...prev.bySubject };
      const prevSub = bySubject[subjectName] || { correct: 0, total: 0 };
      bySubject[subjectName] = { correct: prevSub.correct + correct, total: prevSub.total + total };

      const byDifficulty = { ...prev.byDifficulty };
      const d = quizLesson.difficulty;
      byDifficulty[d] = {
        correct: byDifficulty[d].correct + correct,
        total: byDifficulty[d].total + total,
      };

      return {
        ...prev,
        totalAttempts: prev.totalAttempts + 1,
        correctAnswers: prev.correctAnswers + correct,
        avgTime: prev.totalAttempts === 0
          ? Math.round(timeSpent / Math.max(total, 1))
          : Math.round((prev.avgTime * prev.totalAttempts + timeSpent / Math.max(total, 1)) / (prev.totalAttempts + 1)),
        bySubject,
        byDifficulty,
        recentAttempts: [
          { lessonId: quizLesson.lessonId || quizLesson.lessonTitle, score, total, timestamp: Date.now(), timeSpent },
          ...prev.recentAttempts.slice(0, 49),
        ],
      };
    });

    if (quizLesson.lessonId) {
      setLessonProgress((prev) => {
        const existing = prev[quizLesson.lessonId!] || { attempts: 0, bestScore: 0, completed: false };
        return {
          ...prev,
          [quizLesson.lessonId!]: {
            attempts: existing.attempts + 1,
            bestScore: Math.max(existing.bestScore, score),
            completed: existing.completed || score >= 60,
          },
        };
      });
    }
  }, [quizLesson]);

  const startMockInterview = (preset: typeof INTERVIEW_PRESETS[number]) => {
    saveInterviewSessionConfig({
      durationMinutes: preset.duration,
      role: preset.role,
      company: preset.company,
      subjectName: preset.type,
      questionTarget: preset.questions,
    });
  };

  if (quizLesson) {
    return (
      <div className="space-y-4">
        <MCQQuiz
          subjectId={quizLesson.subjectId}
          lessonTitle={quizLesson.lessonTitle}
          difficulty={quizLesson.difficulty}
          onBack={() => setQuizLesson(null)}
          onComplete={handleQuizComplete}
        />
      </div>
    );
  }

  const filteredLessons = selectedSubject
    ? (diffFilter === 'All' ? selectedSubject.lessons : selectedSubject.lessons.filter(l => l.difficulty === diffFilter))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <FlaskConical size={17} className="text-white" />
            </div>
            <h1 className="text-xl font-700 text-[#0D1B3E]">Practice Hub</h1>
          </div>
          <p className="text-sm text-[#6B7A99]">Subject-wise MCQ assessments with lesson trees, difficulty filters & analytics.</p>
        </div>
      </div>

      {/* Analytics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Attempts', value: analytics.totalAttempts.toString(), icon: <RefreshCw size={14} className="text-blue-500" />, sub: 'quiz sessions' },
          { label: 'Correct Answers', value: analytics.correctAnswers.toString(), icon: <CheckCircle2 size={14} className="text-emerald-500" />, sub: analytics.totalAttempts ? `${accuracyPct}% accuracy` : 'no attempts yet' },
          { label: 'Avg Time/Q', value: analytics.avgTime ? `${analytics.avgTime}s` : '—', icon: <Clock size={14} className="text-amber-500" />, sub: 'per question' },
          { label: 'Streak', value: streakDays ? `${streakDays} day${streakDays === 1 ? '' : 's'}` : '—', icon: <Flame size={14} className="text-orange-500" />, sub: streakDays ? 'keep it up!' : 'complete a quiz' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-[#DDE3EE] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[#F4F6FA] flex items-center justify-center shrink-0">{stat.icon}</div>
              <p className="font-700 text-[#0D1B3E] text-base leading-tight">{stat.value}</p>
            </div>
            <p className="text-[10px] text-[#6B7A99]">{stat.label}</p>
            <p className="text-[10px] text-[#9BA8C0]">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F4F6FA] p-1 rounded-xl w-fit">
        {([
          { key: 'subjects', label: 'Subjects & Lessons', icon: <BookOpen size={13} /> },
          { key: 'mcq', label: 'Quick MCQ', icon: <FileText size={13} /> },
          { key: 'mock', label: 'Mock Interviews', icon: <Mic size={13} /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelectedSubjectId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-600 transition-all ${tab === t.key ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99] hover:text-[#0D1B3E]'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── SUBJECTS TAB ── */}
      {tab === 'subjects' && !selectedSubject && (
        <div className="space-y-4">
          <div className="bg-white border border-[#DDE3EE] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={15} className="text-[#0D9488]" />
              <h3 className="font-700 text-[#0D1B3E] text-sm">Performance by Subject</h3>
            </div>
            {Object.keys(analytics.bySubject).length === 0 ? (
              <p className="text-sm text-[#6B7A99]">No quiz attempts yet. Start a lesson to track performance.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(analytics.bySubject).map(([subj, data]) => {
                  const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                  const subjectObj = subjects.find(s => s.name === subj);
                  return (
                    <div key={subj} className="flex items-center gap-3">
                      <span className="text-xs font-600 text-[#3D5A80] w-16 shrink-0">{subj}</span>
                      <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: subjectObj?.accent || '#0D9488' }} />
                      </div>
                      <span className="text-xs font-700 text-[#0D1B3E] w-10 text-right">{pct}%</span>
                      <span className="text-[10px] text-[#9BA8C0] w-14 text-right">{data.correct}/{data.total}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(sub => {
              const completedCount = sub.lessons.filter(l => l.completed).length;
              return (
                <div key={sub.id} onClick={() => setSelectedSubjectId(sub.id)}
                  className="bg-white border border-[#DDE3EE] rounded-2xl p-5 hover:shadow-md hover:border-[#0D9488]/40 cursor-pointer transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl ${sub.bg} ${sub.border} border flex items-center justify-center ${sub.color}`}>
                      {sub.icon}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-700 text-[#0D1B3E]">{sub.progress}%</p>
                      <p className="text-[10px] text-[#9BA8C0]">complete</p>
                    </div>
                  </div>
                  <h3 className="font-700 text-[#0D1B3E] text-sm mb-1 group-hover:text-[#0D9488] transition-colors">{sub.name}</h3>
                  <p className="text-[11px] text-[#6B7A99] mb-3 leading-relaxed line-clamp-2">{sub.description}</p>
                  <div className="h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${sub.progress}%`, backgroundColor: sub.accent }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#6B7A99]">{completedCount}/{sub.lessons.length} lessons</span>
                    <ChevronRight size={14} className="text-[#9BA8C0] group-hover:text-[#0D9488] transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUBJECT DETAIL ── */}
      {tab === 'subjects' && selectedSubject && (
        <div className="space-y-4">
          <button onClick={() => setSelectedSubjectId(null)} className="flex items-center gap-1.5 text-sm text-[#6B7A99] hover:text-[#0D1B3E] transition-colors">
            <ArrowLeft size={14} /> All Subjects
          </button>

          <div className={`${selectedSubject.bg} ${selectedSubject.border} border rounded-2xl p-5`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${selectedSubject.bg} ${selectedSubject.border} border flex items-center justify-center ${selectedSubject.color}`}>
                {selectedSubject.icon}
              </div>
              <div className="flex-1">
                <h2 className="font-700 text-[#0D1B3E] text-base">{selectedSubject.name}</h2>
                <p className="text-xs text-[#6B7A99] mt-0.5">{selectedSubject.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-800 text-[#0D1B3E]">{selectedSubject.progress}%</p>
                <p className="text-[10px] text-[#6B7A99]">complete</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${selectedSubject.progress}%`, backgroundColor: selectedSubject.accent }} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={13} className="text-[#6B7A99]" />
            <span className="text-xs text-[#6B7A99] font-600">Filter:</span>
            {(['All', 'Easy', 'Medium', 'Hard'] as const).map(d => (
              <button key={d} onClick={() => setDiffFilter(d)}
                className={`px-3 py-1 rounded-lg text-xs font-600 border transition-colors ${diffFilter === d ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-white border-[#DDE3EE] text-[#6B7A99] hover:border-[#0D9488]/40'}`}>
                {d}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredLessons.map((lesson, i) => (
              <div key={lesson.id} className={`bg-white border rounded-2xl transition-all ${lesson.locked ? 'opacity-60 border-[#DDE3EE]' : 'border-[#DDE3EE] hover:border-[#0D9488]/30 hover:shadow-sm'}`}>
                <div
                  className={`flex items-center gap-4 p-4 ${!lesson.locked ? 'cursor-pointer' : ''}`}
                  onClick={() => !lesson.locked && setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-700 ${lesson.completed ? 'bg-emerald-100 text-emerald-600' : lesson.locked ? 'bg-[#F4F6FA] text-[#9BA8C0]' : 'bg-[#0D9488]/10 text-[#0D9488]'}`}>
                    {lesson.completed ? <CheckCircle2 size={16} /> : lesson.locked ? <Lock size={14} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-600 text-[#0D1B3E]">{lesson.title}</p>
                      <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full border ${DIFF_COLORS[lesson.difficulty]}`}>{lesson.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-[#6B7A99]"><Clock size={10} />{lesson.duration}m</span>
                      <span className="flex items-center gap-1 text-[11px] text-[#6B7A99]"><FileText size={10} />{lesson.questions} questions</span>
                      {lesson.attempts > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-600"><Trophy size={10} />Best: {lesson.bestScore}%</span>
                      )}
                    </div>
                  </div>
                  {!lesson.locked && (
                    expandedLesson === lesson.id ? <ChevronUp size={15} className="text-[#9BA8C0]" /> : <ChevronDown size={15} className="text-[#9BA8C0]" />
                  )}
                </div>

                {expandedLesson === lesson.id && !lesson.locked && (
                  <div className="px-4 pb-4 border-t border-[#F4F6FA] pt-3">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
                        <button key={d} onClick={() => setQuizLesson({ subjectId: selectedSubject.id, lessonId: lesson.id, lessonTitle: lesson.title, difficulty: d })}
                          className={`py-2 rounded-xl text-xs font-600 border transition-colors ${DIFF_COLORS[d]} hover:opacity-80`}>
                          {d} Quiz
                        </button>
                      ))}
                    </div>
                    {lesson.attempts > 0 && (
                      <div className="bg-[#F8FAFC] rounded-xl p-3">
                        <p className="text-[11px] font-600 text-[#3D5A80] mb-2">Your Analytics</p>
                        <div className="flex items-center gap-4 text-xs text-[#6B7A99]">
                          <span><strong className="text-[#0D1B3E]">{lesson.attempts}</strong> attempts</span>
                          <span><strong className="text-emerald-600">{lesson.bestScore}%</strong> best score</span>
                          <span><strong className="text-[#0D1B3E]">{Math.round(lesson.bestScore * lesson.questions / 100)}/{lesson.questions}</strong> correct</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-[#DDE3EE] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${lesson.bestScore}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MCQ TAB ── */}
      {tab === 'mcq' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-[#6B7A99]" />
            {(['All', 'Easy', 'Medium', 'Hard'] as const).map(d => (
              <button key={d} onClick={() => setDiffFilter(d)}
                className={`px-3 py-1 rounded-lg text-xs font-600 border transition-colors ${diffFilter === d ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-white border-[#DDE3EE] text-[#6B7A99] hover:border-[#0D9488]/40'}`}>
                {d}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(sub => {
              const qs = (MCQ_BANK[sub.id] || []).filter(q => diffFilter === 'All' || q.difficulty === diffFilter);
              return (
                <div key={sub.id} className="bg-white border border-[#DDE3EE] rounded-2xl p-4 hover:shadow-md hover:border-[#0D9488]/40 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${sub.bg} ${sub.border} border flex items-center justify-center ${sub.color}`}>
                      {sub.icon}
                    </div>
                    <div>
                      <h3 className="font-700 text-[#0D1B3E] text-sm">{sub.name}</h3>
                      <p className="text-[11px] text-[#6B7A99]">{qs.length} questions available</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mb-3">
                    {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => {
                      const count = (MCQ_BANK[sub.id] || []).filter(q => q.difficulty === d).length;
                      return (
                        <span key={d} className={`text-[10px] font-600 px-2 py-0.5 rounded-full border ${DIFF_COLORS[d]}`}>{count} {d}</span>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
                      <button key={d} onClick={() => setQuizLesson({ subjectId: sub.id, lessonTitle: `${sub.name} Quick Quiz`, difficulty: d })}
                        className={`py-1.5 rounded-lg text-[11px] font-600 border transition-colors ${DIFF_COLORS[d]} hover:opacity-80`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MOCK INTERVIEWS TAB ── */}
      {tab === 'mock' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Mic size={15} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700">AI-powered mock interviews. Choosing a preset pre-fills duration and role in Interview Setup.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INTERVIEW_PRESETS.map(mi => (
              <div key={mi.id} className="bg-white border border-[#DDE3EE] rounded-2xl p-4 hover:shadow-md hover:border-[#0D9488]/40 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-700 text-[#0D1B3E] text-sm">{mi.role}</h3>
                    <p className="text-xs text-[#6B7A99] mt-0.5">{mi.company} · {mi.type}</p>
                  </div>
                  <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border shrink-0 ${DIFF_COLORS[mi.difficulty]}`}>{mi.difficulty}</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center gap-1 text-xs text-[#6B7A99]"><Clock size={11} />{mi.duration} min</span>
                  <span className="flex items-center gap-1 text-xs text-[#6B7A99]"><FileText size={11} />~{mi.questions} questions</span>
                </div>
                <Link
                  href="/interview-setup"
                  onClick={() => startMockInterview(mi)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#0D9488] text-white rounded-xl text-xs font-600 hover:bg-[#0b8276] transition-colors"
                >
                  <Mic size={12} /> Start Mock Interview
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
