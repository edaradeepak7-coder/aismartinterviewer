'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BookOpen, Headphones, Mic, Eye, PenLine, Play, Pause, Volume2, CheckCircle2, XCircle, ChevronRight, ArrowLeft, Clock, RotateCcw, TrendingUp, Target, Zap, BarChart2, Star, StopCircle, Filter, Flame, Lock, Unlock, AlertTriangle } from 'lucide-react';

type Skill = 'listening' | 'speaking' | 'reading' | 'writing';
type Level = 'Beginner' | 'Intermediate' | 'Advanced';
type View = 'home' | 'exercise';

interface Exercise {
  id: string;
  skill: Skill;
  title: string;
  level: Level;
  duration: number;
  description: string;
  xp: number;
  completed?: boolean;
  bestScore?: number;
  attempts?: number;
}

interface SkillProgress {
  completed: number;
  total: number;
  avgScore: number;
  xpEarned: number;
  streak: number;
}

// ─── Prerequisite State ───────────────────────────────────────────────────────
interface PrerequisiteState {
  fundamentalsScore: number;      // 0-100, need 70+
  subjectPracticeScore: number;   // 0-100, need 80+
  mockInterviewsAttempted: number; // need 5+
}

const PREREQUISITES: PrerequisiteState = {
  fundamentalsScore: 62,
  subjectPracticeScore: 75,
  mockInterviewsAttempted: 3,
};

const PREREQ_THRESHOLDS = {
  fundamentals: 70,
  subjectPractice: 80,
  mockInterviews: 5,
};

// ─── Prerequisite Unlock Bar Component ───────────────────────────────────────
function PrerequisiteUnlockBar({ prereqs }: { prereqs: PrerequisiteState }) {
  const fundamentalsMet = prereqs.fundamentalsScore >= PREREQ_THRESHOLDS.fundamentals;
  const subjectMet = prereqs.subjectPracticeScore >= PREREQ_THRESHOLDS.subjectPractice;
  const mocksMet = prereqs.mockInterviewsAttempted >= PREREQ_THRESHOLDS.mockInterviews;
  const allMet = fundamentalsMet && subjectMet && mocksMet;

  const totalProgress = Math.round(
    (Math.min(prereqs.fundamentalsScore / PREREQ_THRESHOLDS.fundamentals, 1) * 33.3) +
    (Math.min(prereqs.subjectPracticeScore / PREREQ_THRESHOLDS.subjectPractice, 1) * 33.3) +
    (Math.min(prereqs.mockInterviewsAttempted / PREREQ_THRESHOLDS.mockInterviews, 1) * 33.4)
  );

  return (
    <div className={`rounded-xl border p-5 mb-6 ${allMet ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {allMet ? (
            <Unlock size={18} className="text-emerald-600" />
          ) : (
            <Lock size={18} className="text-amber-600" />
          )}
          <span className={`font-semibold text-sm ${allMet ? 'text-emerald-800' : 'text-amber-800'}`}>
            {allMet ? 'Final Comprehensive Interview — Unlocked!' : 'Final Comprehensive Interview — Locked'}
          </span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${allMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {totalProgress}% complete
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-white/60 rounded-full h-2.5 mb-4 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ${allMet ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${totalProgress}%` }}
        />
      </div>

      {/* Individual prerequisites */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Fundamentals Assessment */}
        <div className={`rounded-lg p-3 border ${fundamentalsMet ? 'bg-emerald-100/60 border-emerald-200' : 'bg-white/60 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-700">Fundamentals Assessment</span>
            {fundamentalsMet ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={14} className="text-amber-500" />
            )}
          </div>
          <div className="flex items-end gap-1 mb-1.5">
            <span className={`text-lg font-bold ${fundamentalsMet ? 'text-emerald-700' : 'text-slate-800'}`}>
              {prereqs.fundamentalsScore}%
            </span>
            <span className="text-xs text-slate-500 mb-0.5">/ {PREREQ_THRESHOLDS.fundamentals}% required</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${fundamentalsMet ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.min((prereqs.fundamentalsScore / PREREQ_THRESHOLDS.fundamentals) * 100, 100)}%` }}
            />
          </div>
          {!fundamentalsMet && (
            <p className="text-xs text-amber-700 mt-1.5">Need {PREREQ_THRESHOLDS.fundamentals - prereqs.fundamentalsScore}% more</p>
          )}
        </div>

        {/* Subject Practice */}
        <div className={`rounded-lg p-3 border ${subjectMet ? 'bg-emerald-100/60 border-emerald-200' : 'bg-white/60 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-700">Subject Practice</span>
            {subjectMet ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={14} className="text-amber-500" />
            )}
          </div>
          <div className="flex items-end gap-1 mb-1.5">
            <span className={`text-lg font-bold ${subjectMet ? 'text-emerald-700' : 'text-slate-800'}`}>
              {prereqs.subjectPracticeScore}%
            </span>
            <span className="text-xs text-slate-500 mb-0.5">/ {PREREQ_THRESHOLDS.subjectPractice}% required</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${subjectMet ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.min((prereqs.subjectPracticeScore / PREREQ_THRESHOLDS.subjectPractice) * 100, 100)}%` }}
            />
          </div>
          {!subjectMet && (
            <p className="text-xs text-amber-700 mt-1.5">Need {PREREQ_THRESHOLDS.subjectPractice - prereqs.subjectPracticeScore}% more</p>
          )}
        </div>

        {/* Mock Interviews */}
        <div className={`rounded-lg p-3 border ${mocksMet ? 'bg-emerald-100/60 border-emerald-200' : 'bg-white/60 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-700">Mock Interviews</span>
            {mocksMet ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={14} className="text-amber-500" />
            )}
          </div>
          <div className="flex items-end gap-1 mb-1.5">
            <span className={`text-lg font-bold ${mocksMet ? 'text-emerald-700' : 'text-slate-800'}`}>
              {prereqs.mockInterviewsAttempted}
            </span>
            <span className="text-xs text-slate-500 mb-0.5">/ {PREREQ_THRESHOLDS.mockInterviews} required</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${mocksMet ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.min((prereqs.mockInterviewsAttempted / PREREQ_THRESHOLDS.mockInterviews) * 100, 100)}%` }}
            />
          </div>
          {!mocksMet && (
            <p className="text-xs text-amber-700 mt-1.5">Need {PREREQ_THRESHOLDS.mockInterviews - prereqs.mockInterviewsAttempted} more</p>
          )}
        </div>
      </div>

      {!allMet && (
        <div className="mt-3 flex items-center gap-2">
          <button className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
            Continue Preparation →
          </button>
          <span className="text-xs text-amber-600">Complete all prerequisites to unlock the final interview</span>
        </div>
      )}

      {allMet && (
        <div className="mt-3">
          <button className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg transition-colors">
            Start Final Comprehensive Interview →
          </button>
        </div>
      )}
    </div>
  );
}

const SKILL_CONFIG: Record<Skill, {
  label: string; icon: React.ReactNode; color: string; bg: string;
  border: string; accent: string; desc: string;
}> = {
  listening: {
    label: 'Listening', icon: <Headphones size={18} />, color: 'text-violet-600',
    bg: 'bg-violet-50', border: 'border-violet-200', accent: '#7c3aed',
    desc: 'Comprehend spoken English in professional and technical contexts',
  },
  speaking: {
    label: 'Speaking', icon: <Mic size={18} />, color: 'text-rose-600',
    bg: 'bg-rose-50', border: 'border-rose-200', accent: '#e11d48',
    desc: 'Express ideas clearly and confidently in interviews and presentations',
  },
  reading: {
    label: 'Reading', icon: <Eye size={18} />, color: 'text-blue-600',
    bg: 'bg-blue-50', border: 'border-blue-200', accent: '#2563eb',
    desc: 'Understand technical documents, job descriptions and articles',
  },
  writing: {
    label: 'Writing', icon: <PenLine size={18} />, color: 'text-amber-600',
    bg: 'bg-amber-50', border: 'border-amber-200', accent: '#d97706',
    desc: 'Craft professional emails, cover letters, reports and summaries',
  },
};

const LEVEL_COLORS: Record<Level, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-red-50 text-red-700 border-red-200',
};

const EXERCISES: Exercise[] = [
  { id: 'l1', skill: 'listening', title: 'Business Meeting Comprehension', level: 'Intermediate', duration: 8, description: 'Listen to a business meeting audio and answer comprehension questions', xp: 50, completed: true, bestScore: 85, attempts: 2 },
  { id: 'l2', skill: 'listening', title: 'Technical Interview Listening', level: 'Advanced', duration: 12, description: 'Listen to a mock technical interview and identify key points', xp: 80, completed: false, bestScore: 0, attempts: 0 },
  { id: 'l3', skill: 'listening', title: 'Product Demo Walkthrough', level: 'Beginner', duration: 6, description: 'Listen to a product demo and answer questions about features', xp: 35, completed: true, bestScore: 92, attempts: 3 },
  { id: 's1', skill: 'speaking', title: 'Self Introduction Practice', level: 'Beginner', duration: 5, description: 'Record a 60-second professional self-introduction', xp: 40, completed: true, bestScore: 78, attempts: 4 },
  { id: 's2', skill: 'speaking', title: 'Explain a Technical Concept', level: 'Intermediate', duration: 10, description: 'Explain a technical concept clearly to a non-technical audience', xp: 70, completed: false, bestScore: 0, attempts: 0 },
  { id: 's3', skill: 'speaking', title: 'Behavioral Interview Response', level: 'Advanced', duration: 8, description: 'Answer a STAR-method behavioral question with audio recording', xp: 90, completed: false, bestScore: 0, attempts: 0 },
  { id: 'r1', skill: 'reading', title: 'Job Description Analysis', level: 'Beginner', duration: 6, description: 'Read a job description and identify key requirements', xp: 35, completed: true, bestScore: 90, attempts: 2 },
  { id: 'r2', skill: 'reading', title: 'Technical Documentation', level: 'Advanced', duration: 15, description: 'Read and summarize a technical API documentation', xp: 90, completed: false, bestScore: 0, attempts: 0 },
  { id: 'r3', skill: 'reading', title: 'React Library Overview', level: 'Intermediate', duration: 10, description: 'Read a passage about React and answer comprehension questions', xp: 60, completed: false, bestScore: 0, attempts: 0 },
  { id: 'w1', skill: 'writing', title: 'Professional Email Writing', level: 'Beginner', duration: 10, description: 'Write a professional follow-up email after an interview', xp: 45, completed: true, bestScore: 82, attempts: 2 },
  { id: 'w2', skill: 'writing', title: 'Cover Letter Composition', level: 'Intermediate', duration: 20, description: 'Write a compelling cover letter for a software engineer role', xp: 75, completed: false, bestScore: 0, attempts: 0 },
  { id: 'w3', skill: 'writing', title: 'Technical Blog Post Intro', level: 'Advanced', duration: 25, description: 'Write an engaging introduction for a technical blog post', xp: 100, completed: false, bestScore: 0, attempts: 0 },
];

const LISTENING_CONTENT: Record<string, { passage: string; questions: { q: string; options: string[]; answer: number }[] }> = {
  l1: {
    passage: `"Good morning everyone. Today we'll discuss the Q3 product roadmap. Our primary focus will be improving the checkout flow, which currently has a 23% drop-off rate. The engineering team has proposed three solutions: first, a one-click checkout for returning customers; second, guest checkout without account creation; and third, a simplified form with auto-fill capabilities. We need to decide which to prioritize given our current sprint capacity of 40 story points."`,
    questions: [
      { q: 'What is the current checkout drop-off rate?', options: ['18%', '23%', '31%', '15%'], answer: 1 },
      { q: 'How many solutions did the engineering team propose?', options: ['Two', 'Three', 'Four', 'Five'], answer: 1 },
      { q: 'What is the sprint capacity mentioned?', options: ['30 story points', '40 story points', '50 story points', '60 story points'], answer: 1 },
    ],
  },
  l2: {
    passage: `"Welcome to today's technical interview. I'm going to ask you about your experience with distributed systems. Can you walk me through how you'd design a URL shortener that handles 100 million requests per day? Think about the data model, the hashing strategy, and how you'd handle cache invalidation. Also consider how you'd ensure high availability and what trade-offs you'd make between consistency and availability."`,
    questions: [
      { q: 'What system is the candidate asked to design?', options: ['Search engine', 'URL shortener', 'Chat application', 'Payment system'], answer: 1 },
      { q: 'How many requests per day should the system handle?', options: ['10 million', '50 million', '100 million', '1 billion'], answer: 2 },
      { q: 'What trade-off is mentioned?', options: ['Speed vs cost', 'Consistency vs availability', 'Latency vs throughput', 'Security vs usability'], answer: 1 },
    ],
  },
  l3: {
    passage: `"Welcome to our product demo. Today I'll show you our new project management tool. The dashboard gives you a real-time overview of all active projects. You can filter by team, deadline, or priority. The Kanban board supports drag-and-drop, and each card can have subtasks, attachments, and comments. Our AI assistant can automatically assign tasks based on team member workload and skills."`,
    questions: [
      { q: 'What type of board does the tool support?', options: ['Gantt chart', 'Kanban board', 'Scrum board', 'Roadmap'], answer: 1 },
      { q: 'What can the AI assistant do?', options: ['Write code', 'Assign tasks automatically', 'Send emails', 'Generate reports'], answer: 1 },
      { q: 'What can cards have?', options: ['Only comments', 'Subtasks, attachments, and comments', 'Only attachments', 'Only subtasks'], answer: 1 },
    ],
  },
};

const READING_CONTENT: Record<string, { passage: string; questions: { q: string; options: string[]; answer: number }[] }> = {
  r1: {
    passage: `Senior Frontend Engineer — TechCorp (Remote)\n\nWe are looking for a Senior Frontend Engineer with 5+ years of experience building scalable web applications. You will work closely with our product and design teams to deliver exceptional user experiences.\n\nRequirements: Proficiency in React, TypeScript, and modern CSS. Experience with state management (Redux, Zustand). Familiarity with testing frameworks (Jest, Cypress). Strong understanding of web performance optimization. Experience with CI/CD pipelines is a plus.\n\nNice to have: GraphQL, Next.js, micro-frontend architecture experience.`,
    questions: [
      { q: 'How many years of experience are required?', options: ['3+', '4+', '5+', '7+'], answer: 2 },
      { q: 'Which testing frameworks are mentioned?', options: ['Mocha and Chai', 'Jest and Cypress', 'Jasmine and Karma', 'Vitest and Playwright'], answer: 1 },
      { q: 'What is listed as "nice to have"?', options: ['React and TypeScript', 'Redux and Zustand', 'GraphQL and Next.js', 'Jest and Cypress'], answer: 2 },
    ],
  },
  r2: {
    passage: `REST API Documentation — UserService v2.1\n\nBase URL: https://api.example.com/v2\n\nAuthentication: All endpoints require a Bearer token in the Authorization header.\n\nGET /users/{id} — Returns a user object. Response: { id, name, email, role, createdAt }. Status codes: 200 OK, 404 Not Found, 401 Unauthorized.\n\nPOST /users — Creates a new user. Body: { name, email, password, role }. Required fields: name, email, password. Response: 201 Created with user object.\n\nRate limiting: 100 requests per minute per API key. Exceeding this returns 429 Too Many Requests.`,
    questions: [
      { q: 'What authentication method is used?', options: ['API Key in query', 'Bearer token', 'Basic Auth', 'OAuth 2.0'], answer: 1 },
      { q: 'What status code is returned when a user is not found?', options: ['400', '401', '403', '404'], answer: 3 },
      { q: 'What is the rate limit?', options: ['50 req/min', '100 req/min', '200 req/min', '1000 req/hour'], answer: 1 },
    ],
  },
  r3: {
    passage: `React is a JavaScript library for building user interfaces, developed by Facebook (now Meta). React uses a component-based architecture where UIs are built from reusable, self-contained components. Each component manages its own state and can receive data through props.\n\nReact 18 introduced concurrent rendering, which allows React to prepare multiple versions of the UI simultaneously. Key features include: automatic batching of state updates, the new useTransition hook for non-urgent updates, and Suspense improvements for data fetching. The virtual DOM diffing algorithm ensures efficient updates by only re-rendering changed components.`,
    questions: [
      { q: 'Who developed React?', options: ['Google', 'Microsoft', 'Meta (Facebook)', 'Twitter'], answer: 2 },
      { q: 'What did React 18 introduce?', options: ['Hooks', 'Concurrent rendering', 'JSX', 'Virtual DOM'], answer: 1 },
      { q: 'What does the virtual DOM algorithm ensure?', options: ['Faster network requests', 'Efficient updates by re-rendering only changed components', 'Better SEO', 'Smaller bundle size'], answer: 1 },
    ],
  },
};

const WRITING_PROMPTS: Record<string, { prompt: string; minWords: number; maxWords: number; criteria: string[] }> = {
  w1: {
    prompt: 'Write a professional follow-up email (100-150 words) to a hiring manager after a technical interview for a Senior Frontend Engineer position at TechCorp. Include: thank them for their time, reference a specific topic discussed, reiterate your interest and key qualification, polite closing with next steps.',
    minWords: 100, maxWords: 150,
    criteria: ['Professional tone', 'Specific reference to interview', 'Clear call to action', 'Proper email structure'],
  },
  w2: {
    prompt: 'Write a compelling cover letter introduction (150-200 words) for a Software Engineer role at a fintech startup. Highlight your relevant experience, passion for the domain, and why you are a strong fit. Avoid generic phrases.',
    minWords: 150, maxWords: 200,
    criteria: ['Engaging opening', 'Relevant experience highlighted', 'Domain passion shown', 'Avoids clichés'],
  },
  w3: {
    prompt: 'Write an engaging introduction (200-250 words) for a technical blog post titled "Why TypeScript is Worth the Learning Curve". Target audience: intermediate JavaScript developers. Include a hook, the problem statement, and a preview of what the article will cover.',
    minWords: 200, maxWords: 250,
    criteria: ['Strong hook', 'Clear problem statement', 'Article preview included', 'Appropriate technical level'],
  },
};

const SPEAKING_PROMPTS: Record<string, { prompt: string; tips: string[]; minSeconds: number }> = {
  s1: {
    prompt: 'Introduce yourself professionally in 60 seconds. Include your name, background, key technical skills, and why you are interested in this role.',
    tips: ['Start with your name and current role', 'Mention 2-3 key skills', 'End with your motivation'],
    minSeconds: 30,
  },
  s2: {
    prompt: 'Explain what a REST API is to a non-technical stakeholder in 90 seconds. Use an analogy and avoid jargon.',
    tips: ['Use a real-world analogy (e.g., restaurant menu)', 'Avoid technical acronyms', 'Focus on the benefit, not the mechanism'],
    minSeconds: 45,
  },
  s3: {
    prompt: 'Answer this behavioral question using the STAR method (90 seconds): "Tell me about a time you had to debug a critical production issue under pressure."',
    tips: ['Situation: Set the context briefly', 'Task: What was your responsibility?', 'Action: What did you do specifically?', 'Result: What was the outcome?'],
    minSeconds: 60,
  },
};

export default function LSRWContent() {
  const [view, setView] = useState<View>('home');
  const [activeSkill, setActiveSkill] = useState<Skill>('listening');
  const [levelFilter, setLevelFilter] = useState<Level | 'All'>('All');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [listeningAnswers, setListeningAnswers] = useState<Record<number, number>>({});
  const [readingAnswers, setReadingAnswers] = useState<Record<number, number>>({});
  const [writingText, setWritingText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showPrereqs, setShowPrereqs] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>(EXERCISES);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-skill progress
  const skillProgress: Record<Skill, SkillProgress> = {
    listening: { completed: exercises.filter(e => e.skill === 'listening' && e.completed).length, total: exercises.filter(e => e.skill === 'listening').length, avgScore: 88, xpEarned: 127, streak: 5 },
    speaking: { completed: exercises.filter(e => e.skill === 'speaking' && e.completed).length, total: exercises.filter(e => e.skill === 'speaking').length, avgScore: 78, xpEarned: 40, streak: 3 },
    reading: { completed: exercises.filter(e => e.skill === 'reading' && e.completed).length, total: exercises.filter(e => e.skill === 'reading').length, avgScore: 90, xpEarned: 95, streak: 4 },
    writing: { completed: exercises.filter(e => e.skill === 'writing' && e.completed).length, total: exercises.filter(e => e.skill === 'writing').length, avgScore: 82, xpEarned: 45, streak: 2 },
  };

  const startExercise = (ex: Exercise) => {
    setSelectedExercise(ex);
    setView('exercise');
    setSubmitted(false);
    setScore(null);
    setListeningAnswers({});
    setReadingAnswers({});
    setWritingText('');
    setAudioProgress(0);
    setIsPlaying(false);
    setRecording(false);
    setRecordingSeconds(0);
  };

  const handlePlayAudio = () => {
    setIsPlaying(true);
    let progress = audioProgress;
    timerRef.current = setInterval(() => {
      progress += 1;
      setAudioProgress(progress);
      if (progress >= 100) {
        clearInterval(timerRef.current!);
        setIsPlaying(false);
      }
    }, 100);
  };

  const handlePauseAudio = () => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleStartRecording = () => {
    setRecording(true);
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordingSeconds(t => {
        const maxTime = selectedExercise ? (SPEAKING_PROMPTS[selectedExercise.id]?.minSeconds || 60) * 2 : 120;
        if (t >= maxTime) {
          clearInterval(timerRef.current!);
          setRecording(false);
          return maxTime;
        }
        return t + 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSubmit = () => {
    if (!selectedExercise) return;
    let s = 0;
    if (selectedExercise.skill === 'listening') {
      const content = LISTENING_CONTENT[selectedExercise.id];
      if (content) {
        content.questions.forEach((q, i) => { if (listeningAnswers[i] === q.answer) s += Math.floor(100 / content.questions.length); });
      }
    } else if (selectedExercise.skill === 'reading') {
      const content = READING_CONTENT[selectedExercise.id];
      if (content) {
        content.questions.forEach((q, i) => { if (readingAnswers[i] === q.answer) s += Math.floor(100 / content.questions.length); });
      }
    } else if (selectedExercise.skill === 'speaking') {
      const minSec = SPEAKING_PROMPTS[selectedExercise.id]?.minSeconds || 30;
      s = recordingSeconds >= minSec ? 90 : recordingSeconds >= minSec * 0.6 ? 70 : recordingSeconds > 5 ? 50 : 20;
    } else if (selectedExercise.skill === 'writing') {
      const prompt = WRITING_PROMPTS[selectedExercise.id];
      const wc = writingText.trim().split(/\s+/).filter(Boolean).length;
      if (prompt) {
        s = wc >= prompt.minWords ? 90 : wc >= prompt.minWords * 0.7 ? 72 : wc >= prompt.minWords * 0.4 ? 50 : 25;
      }
    }
    s = Math.min(100, s);
    setScore(s);
    setSubmitted(true);
    // Update exercise record
    setExercises(prev => prev.map(e => e.id === selectedExercise.id
      ? { ...e, completed: true, attempts: (e.attempts || 0) + 1, bestScore: Math.max(e.bestScore || 0, s) }
      : e
    ));
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  const filteredExercises = exercises.filter(e =>
    e.skill === activeSkill && (levelFilter === 'All' || e.level === levelFilter)
  );

  // ── EXERCISE VIEW ──
  if (view === 'exercise' && selectedExercise) {
    const cfg = SKILL_CONFIG[selectedExercise.skill];
    const listeningContent = LISTENING_CONTENT[selectedExercise.id];
    const readingContent = READING_CONTENT[selectedExercise.id];
    const writingPrompt = WRITING_PROMPTS[selectedExercise.id];
    const speakingPrompt = SPEAKING_PROMPTS[selectedExercise.id];

    return (
      <div className="space-y-5">
        <button onClick={() => { setView('home'); setSelectedExercise(null); if (timerRef.current) clearInterval(timerRef.current); }}
          className="flex items-center gap-1.5 text-sm text-[#6B7A99] hover:text-[#0D1B3E] transition-colors">
          <ArrowLeft size={14} /> Back to LSRW
        </button>

        <div className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4 flex items-center gap-3`}>
          <div className={`w-11 h-11 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center ${cfg.color}`}>
            {cfg.icon}
          </div>
          <div className="flex-1">
            <p className={`text-[10px] font-700 ${cfg.color} uppercase tracking-wide`}>{cfg.label}</p>
            <h2 className="font-700 text-[#0D1B3E] text-base">{selectedExercise.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border ${LEVEL_COLORS[selectedExercise.level]}`}>{selectedExercise.level}</span>
            <span className="flex items-center gap-1 text-xs text-[#6B7A99]"><Clock size={11} />{selectedExercise.duration}m</span>
            <span className="flex items-center gap-1 text-xs text-amber-600 font-600"><Zap size={11} />+{selectedExercise.xp} XP</span>
          </div>
        </div>

        {submitted ? (
          <div className="bg-white border border-[#DDE3EE] rounded-2xl p-8 text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ring-4 ${score >= 80 ? 'bg-emerald-50 ring-emerald-100' : score >= 60 ? 'bg-amber-50 ring-amber-100' : 'bg-red-50 ring-red-100'}`}>
              <span className={`text-3xl font-800 ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{score}%</span>
            </div>
            <h3 className="font-700 text-[#0D1B3E] text-lg mb-1">{score >= 80 ? '🎉 Excellent!' : score >= 60 ? '👍 Good Job!' : '💪 Keep Practicing!'}</h3>
            <p className="text-sm text-[#6B7A99] mb-4">You earned <strong className="text-amber-600">+{selectedExercise.xp} XP</strong></p>

            {/* Answer review for MCQ-based skills */}
            {(selectedExercise.skill === 'listening' || selectedExercise.skill === 'reading') && (() => {
              const content = selectedExercise.skill === 'listening' ? listeningContent : readingContent;
              const answers = selectedExercise.skill === 'listening' ? listeningAnswers : readingAnswers;
              if (!content) return null;
              return (
                <div className="mt-4 text-left space-y-2 max-w-lg mx-auto mb-6">
                  {content.questions.map((q, i) => {
                    const correct = answers[i] === q.answer;
                    return (
                      <div key={i} className={`flex items-start gap-2 p-3 rounded-xl border ${correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        {correct ? <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" /> : <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />}
                        <div>
                          <p className="text-xs font-600 text-[#0D1B3E]">{q.q}</p>
                          <p className={`text-[11px] mt-0.5 ${correct ? 'text-emerald-600' : 'text-red-500'}`}>
                            {correct ? 'Correct!' : `Correct: ${q.options[q.answer]}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Writing feedback */}
            {selectedExercise.skill === 'writing' && writingPrompt && (
              <div className="mt-4 text-left max-w-lg mx-auto mb-6">
                <p className="text-xs font-700 text-[#0D1B3E] mb-2">Scoring Criteria</p>
                <div className="space-y-1.5">
                  {writingPrompt.criteria.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#F8FAFC] border border-[#DDE3EE] rounded-lg px-3 py-2">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-[#3D5A80]">{c}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#6B7A99] mt-2">Word count: {writingText.trim().split(/\s+/).filter(Boolean).length} / {writingPrompt.minWords}–{writingPrompt.maxWords} target</p>
              </div>
            )}

            {/* Speaking feedback */}
            {selectedExercise.skill === 'speaking' && speakingPrompt && (
              <div className="mt-4 text-left max-w-lg mx-auto mb-6 bg-[#F8FAFC] border border-[#DDE3EE] rounded-xl p-4">
                <p className="text-xs font-700 text-[#0D1B3E] mb-2">Recording Summary</p>
                <p className="text-sm text-[#3D5A80]">Duration: <strong>{recordingSeconds}s</strong> (minimum: {speakingPrompt.minSeconds}s)</p>
                <div className="mt-2 h-2 bg-[#DDE3EE] rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (recordingSeconds / (speakingPrompt.minSeconds * 2)) * 100)}%` }} />
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button onClick={() => { setSubmitted(false); setScore(null); setListeningAnswers({}); setReadingAnswers({}); setWritingText(''); setAudioProgress(0); setRecordingSeconds(0); setRecording(false); }}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#DDE3EE] rounded-xl text-sm font-600 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors">
                <RotateCcw size={13} /> Try Again
              </button>
              <button onClick={() => { setView('home'); setSelectedExercise(null); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0D9488] text-white rounded-xl text-sm font-600 hover:bg-[#0b8276] transition-colors">
                More Exercises <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#DDE3EE] rounded-2xl p-5 space-y-5">

            {/* LISTENING */}
            {selectedExercise.skill === 'listening' && listeningContent && (
              <>
                <div className="bg-[#0D1B3E] rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={isPlaying ? handlePauseAudio : handlePlayAudio}
                      className="w-10 h-10 rounded-full bg-[#0D9488] flex items-center justify-center hover:bg-[#0b8276] transition-colors shrink-0">
                      {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0D9488] rounded-full transition-all" style={{ width: `${audioProgress}%` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-white/40">{Math.floor(audioProgress * 0.6)}s</span>
                        <span className="text-[10px] text-white/40">1:00</span>
                      </div>
                    </div>
                    <Volume2 size={15} className="text-white/40" />
                  </div>
                  <p className="text-xs text-white/60 italic leading-relaxed">{listeningContent.passage}</p>
                </div>
                <div className="space-y-4">
                  {listeningContent.questions.map((q, i) => (
                    <div key={i}>
                      <p className="text-sm font-600 text-[#0D1B3E] mb-2">{i + 1}. {q.q}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <button key={oi} onClick={() => setListeningAnswers(prev => ({ ...prev, [i]: oi }))}
                            className={`px-3 py-2 rounded-xl text-xs font-500 border text-left transition-colors ${listeningAnswers[i] === oi ? 'bg-violet-50 border-violet-400 text-violet-700' : 'border-[#DDE3EE] text-[#3D5A80] hover:border-violet-300'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* SPEAKING */}
            {selectedExercise.skill === 'speaking' && speakingPrompt && (
              <>
                <div className="bg-[#F4F6FA] rounded-2xl p-4">
                  <p className="text-xs font-700 text-[#3D5A80] mb-2 uppercase tracking-wide">Prompt</p>
                  <p className="text-sm text-[#0D1B3E] leading-relaxed">{speakingPrompt.prompt}</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-xs font-700 text-rose-700 mb-1.5">Tips</p>
                  <ul className="space-y-1">
                    {speakingPrompt.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-rose-600">
                        <span className="mt-1 w-1 h-1 rounded-full bg-rose-400 shrink-0" />{tip}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${recording ? 'bg-red-100 ring-4 ring-red-300 animate-pulse' : 'bg-[#F4F6FA]'}`}>
                    <Mic size={32} className={recording ? 'text-red-500' : 'text-[#6B7A99]'} />
                  </div>
                  {recording && (
                    <div className="text-center">
                      <p className="text-3xl font-800 text-red-500 tabular-nums">{recordingSeconds}s</p>
                      <p className="text-xs text-[#6B7A99]">Recording… (min {speakingPrompt.minSeconds}s)</p>
                    </div>
                  )}
                  {!recording && recordingSeconds > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-600 text-emerald-600 flex items-center gap-1 justify-center"><CheckCircle2 size={14} /> Recorded {recordingSeconds}s</p>
                      <p className="text-xs text-[#6B7A99] mt-0.5">Minimum required: {speakingPrompt.minSeconds}s</p>
                    </div>
                  )}
                  <button onClick={recording ? handleStopRecording : handleStartRecording}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-600 transition-colors ${recording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-rose-500 text-white hover:bg-rose-600'}`}>
                    {recording ? <><StopCircle size={15} /> Stop Recording</> : recordingSeconds > 0 ? <><RotateCcw size={15} /> Re-record</> : <><Mic size={15} /> Start Recording</>}
                  </button>
                </div>
              </>
            )}

            {/* READING */}
            {selectedExercise.skill === 'reading' && readingContent && (
              <>
                <div className="bg-[#F8FAFC] border border-[#DDE3EE] rounded-2xl p-4">
                  <p className="text-xs font-700 text-[#3D5A80] mb-2 uppercase tracking-wide">Read the following passage:</p>
                  <p className="text-sm text-[#0D1B3E] leading-relaxed whitespace-pre-line">{readingContent.passage}</p>
                </div>
                <div className="space-y-4">
                  {readingContent.questions.map((q, i) => (
                    <div key={i}>
                      <p className="text-sm font-600 text-[#0D1B3E] mb-2">{i + 1}. {q.q}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <button key={oi} onClick={() => setReadingAnswers(prev => ({ ...prev, [i]: oi }))}
                            className={`px-3 py-2 rounded-xl text-xs font-500 border text-left transition-colors ${readingAnswers[i] === oi ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-[#DDE3EE] text-[#3D5A80] hover:border-blue-300'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* WRITING */}
            {selectedExercise.skill === 'writing' && writingPrompt && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-xs font-700 text-amber-700 mb-2 uppercase tracking-wide">Writing Prompt</p>
                  <p className="text-sm text-[#0D1B3E] leading-relaxed">{writingPrompt.prompt}</p>
                </div>
                <div className="bg-[#F8FAFC] border border-[#DDE3EE] rounded-xl p-3">
                  <p className="text-xs font-700 text-[#3D5A80] mb-1.5">Scoring Criteria</p>
                  <div className="flex flex-wrap gap-1.5">
                    {writingPrompt.criteria.map((c, i) => (
                      <span key={i} className="text-[11px] bg-white border border-[#DDE3EE] text-[#6B7A99] px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <textarea value={writingText} onChange={e => setWritingText(e.target.value)} rows={10}
                    placeholder="Start writing your response here..."
                    className="w-full px-4 py-3 border border-[#DDE3EE] rounded-2xl text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20 resize-none transition-colors" />
                  <div className="flex justify-between mt-1.5">
                    <span className={`text-[11px] font-600 ${writingText.trim().split(/\s+/).filter(Boolean).length >= writingPrompt.minWords ? 'text-emerald-600' : 'text-[#9BA8C0]'}`}>
                      {writingText.trim().split(/\s+/).filter(Boolean).length} / {writingPrompt.minWords}–{writingPrompt.maxWords} words
                    </span>
                    <span className="text-[11px] text-[#9BA8C0]">{writingText.length} chars</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={handleSubmit}
                disabled={
                  (selectedExercise.skill === 'listening' && listeningContent && Object.keys(listeningAnswers).length < listeningContent.questions.length) ||
                  (selectedExercise.skill === 'reading' && readingContent && Object.keys(readingAnswers).length < readingContent.questions.length) ||
                  (selectedExercise.skill === 'speaking' && recordingSeconds === 0) ||
                  (selectedExercise.skill === 'writing' && writingText.trim().length < 20)
                }
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0D9488] text-white rounded-xl text-sm font-600 hover:bg-[#0b8276] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Submit Exercise <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── HOME VIEW ──
  const skills: Skill[] = ['listening', 'speaking', 'reading', 'writing'];
  const totalXP = Object.values(skillProgress).reduce((s, p) => s + p.xpEarned, 0);
  const totalCompleted = Object.values(skillProgress).reduce((s, p) => s + p.completed, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <BookOpen size={17} className="text-white" />
          </div>
          <h1 className="text-xl font-700 text-[#0D1B3E]">LSRW Skills</h1>
          <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-700 px-2 py-0.5 rounded-full">4 Skills</span>
        </div>
        <p className="text-sm text-[#6B7A99]">Master Listening, Speaking, Reading, and Writing — each tracked independently.</p>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Exercises Done', value: totalCompleted.toString(), icon: <CheckCircle2 size={14} className="text-emerald-500" />, sub: `of ${EXERCISES.length} total` },
          { label: 'Total XP', value: totalXP.toString(), icon: <Zap size={14} className="text-amber-500" />, sub: 'earned' },
          { label: 'Best Streak', value: '5 days', icon: <Flame size={14} className="text-orange-500" />, sub: 'Listening' },
          { label: 'Avg Score', value: `${Math.round(Object.values(skillProgress).reduce((s, p) => s + p.avgScore, 0) / 4)}%`, icon: <Target size={14} className="text-teal-500" />, sub: 'across skills' },
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

      {/* Per-skill progress bars */}
      <div className="bg-white border border-[#DDE3EE] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={15} className="text-[#0D9488]" />
          <h3 className="font-700 text-[#0D1B3E] text-sm">Progress by Skill</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {skills.map(skill => {
            const cfg = SKILL_CONFIG[skill];
            const prog = skillProgress[skill];
            const pct = prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
            return (
              <div key={skill} className={`${cfg.bg} ${cfg.border} border rounded-xl p-3.5`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cfg.color}>{cfg.icon}</span>
                  <span className={`text-sm font-700 ${cfg.color}`}>{cfg.label}</span>
                  <span className="ml-auto text-xs font-700 text-[#0D1B3E]">{pct}%</span>
                </div>
                <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.accent }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#6B7A99]">
                  <span>{prog.completed}/{prog.total} exercises</span>
                  <span className="flex items-center gap-1 text-amber-600 font-600"><Zap size={9} />{prog.xpEarned} XP</span>
                  <span className="flex items-center gap-1"><TrendingUp size={9} />{prog.avgScore}% avg</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skill tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {skills.map(skill => {
          const cfg = SKILL_CONFIG[skill];
          const active = activeSkill === skill;
          const prog = skillProgress[skill];
          return (
            <button key={skill} onClick={() => setActiveSkill(skill)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-600 whitespace-nowrap transition-all ${active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-white border-[#DDE3EE] text-[#6B7A99] hover:border-[#0D9488]/40'}`}>
              <span className={active ? cfg.color : 'text-[#9BA8C0]'}>{cfg.icon}</span>
              {cfg.label}
              <span className={`text-[10px] font-700 px-1.5 py-0.5 rounded-full ${active ? 'bg-white/60' : 'bg-[#F4F6FA]'} text-[#6B7A99]`}>
                {prog.completed}/{prog.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Skill description + level filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`${SKILL_CONFIG[activeSkill].bg} ${SKILL_CONFIG[activeSkill].border} border rounded-xl px-4 py-2.5 flex items-center gap-2 flex-1 min-w-0`}>
          <span className={SKILL_CONFIG[activeSkill].color}>{SKILL_CONFIG[activeSkill].icon}</span>
          <p className="text-sm text-[#3D5A80] truncate">{SKILL_CONFIG[activeSkill].desc}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-[#6B7A99]" />
          {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`px-2.5 py-1 rounded-lg text-xs font-600 border transition-colors ${levelFilter === l ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-white border-[#DDE3EE] text-[#6B7A99] hover:border-[#0D9488]/40'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map(ex => {
          const cfg = SKILL_CONFIG[ex.skill];
          return (
            <div key={ex.id} className="bg-white border border-[#DDE3EE] rounded-2xl p-4 hover:shadow-md hover:border-[#0D9488]/40 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    {ex.completed && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                    <h3 className="font-700 text-[#0D1B3E] text-sm">{ex.title}</h3>
                  </div>
                  <p className="text-xs text-[#6B7A99] leading-relaxed">{ex.description}</p>
                </div>
                <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border shrink-0 ${LEVEL_COLORS[ex.level]}`}>{ex.level}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center gap-1 text-xs text-[#6B7A99]"><Clock size={11} />{ex.duration} min</span>
                <span className="flex items-center gap-1 text-xs text-amber-600 font-600"><Zap size={11} />+{ex.xp} XP</span>
                {ex.attempts && ex.attempts > 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-600"><Star size={11} />{ex.bestScore}%</span>
                )}
              </div>
              {ex.completed && ex.bestScore && (
                <div className="mb-3">
                  <div className="h-1 bg-[#F4F6FA] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${ex.bestScore}%`, backgroundColor: cfg.accent }} />
                  </div>
                </div>
              )}
              <button onClick={() => startExercise(ex)}
                className={`w-full flex items-center justify-center gap-1.5 py-2 ${cfg.bg} ${cfg.border} border rounded-xl text-xs font-600 ${cfg.color} hover:opacity-80 transition-opacity`}>
                <Play size={12} /> {ex.completed ? 'Practice Again' : 'Start Exercise'}
              </button>
            </div>
          );
        })}
        {filteredExercises.length === 0 && (
          <div className="col-span-full text-center py-8 text-sm text-[#9BA8C0]">No exercises match the selected level.</div>
        )}
      </div>
    </div>
  );
}
