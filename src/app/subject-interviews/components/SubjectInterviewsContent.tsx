'use client';
import React, { useState } from 'react';
import { Code2, Database, Globe, Cpu, Cloud, GitBranch, Search, Zap, Clock, Star, ArrowRight, BookOpen, Target, Filter } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { useCreditBalance, INTERVIEW_DURATION_OPERATIONS } from '@/lib/hooks/useCreditBalance';
import CreditCheckModal from '@/components/CreditCheckModal';
import { useRouter } from 'next/navigation';

interface Subject {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  totalQuestions: number;
  topics: string[];
  available: boolean;
  popular?: boolean;
  rating?: number;
}

const SUBJECTS: Subject[] = [
  {
    id: 'java',
    name: 'Java',
    icon: <Code2 size={20} />,
    color: 'from-orange-500 to-red-600',
    category: 'Programming',
    difficulty: 'Intermediate',
    totalQuestions: 85,
    topics: ['OOP', 'Collections', 'Multithreading', 'Spring Boot', 'JVM'],
    available: true,
    popular: true,
    rating: 4.7,
  },
  {
    id: 'python',
    name: 'Python',
    icon: <Code2 size={20} />,
    color: 'from-blue-500 to-indigo-600',
    category: 'Programming',
    difficulty: 'Beginner',
    totalQuestions: 92,
    topics: ['Data Types', 'OOP', 'Libraries', 'Django', 'Async'],
    available: true,
    popular: true,
    rating: 4.8,
  },
  {
    id: 'react',
    name: 'React',
    icon: <Globe size={20} />,
    color: 'from-cyan-500 to-blue-600',
    category: 'Frontend',
    difficulty: 'Intermediate',
    totalQuestions: 76,
    topics: ['Hooks', 'State Management', 'Performance', 'Testing', 'Next.js'],
    available: true,
    popular: true,
    rating: 4.6,
  },
  {
    id: 'sql',
    name: 'SQL & Databases',
    icon: <Database size={20} />,
    color: 'from-teal-500 to-emerald-600',
    category: 'Database',
    difficulty: 'Intermediate',
    totalQuestions: 68,
    topics: ['Queries', 'Joins', 'Indexing', 'Transactions', 'Optimization'],
    available: true,
    rating: 4.5,
  },
  {
    id: 'dsa',
    name: 'Data Structures & Algorithms',
    icon: <GitBranch size={20} />,
    color: 'from-violet-500 to-purple-600',
    category: 'CS Fundamentals',
    difficulty: 'Advanced',
    totalQuestions: 110,
    topics: ['Arrays', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting'],
    available: true,
    popular: true,
    rating: 4.9,
  },
  {
    id: 'ml',
    name: 'Machine Learning',
    icon: <Cpu size={20} />,
    color: 'from-pink-500 to-rose-600',
    category: 'AI/ML',
    difficulty: 'Advanced',
    totalQuestions: 0,
    topics: [],
    available: false,
  },
  {
    id: 'cloud',
    name: 'Cloud & AWS',
    icon: <Cloud size={20} />,
    color: 'from-amber-500 to-orange-600',
    category: 'Cloud',
    difficulty: 'Intermediate',
    totalQuestions: 0,
    topics: [],
    available: false,
  },
  {
    id: 'devops',
    name: 'DevOps',
    icon: <GitBranch size={20} />,
    color: 'from-slate-500 to-slate-700',
    category: 'Infrastructure',
    difficulty: 'Intermediate',
    totalQuestions: 0,
    topics: [],
    available: false,
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    icon: <Code2 size={20} />,
    color: 'from-green-500 to-emerald-600',
    category: 'Backend',
    difficulty: 'Intermediate',
    totalQuestions: 58,
    topics: ['Express', 'Async/Await', 'REST APIs', 'Authentication', 'Performance'],
    available: true,
    rating: 4.4,
  },
  {
    id: 'system-design',
    name: 'System Design',
    icon: <Target size={20} />,
    color: 'from-indigo-500 to-blue-700',
    category: 'Architecture',
    difficulty: 'Advanced',
    totalQuestions: 45,
    topics: ['Scalability', 'Load Balancing', 'Caching', 'Microservices', 'CAP Theorem'],
    available: true,
    popular: true,
    rating: 4.8,
  },
];

const DIFFICULTY_COLORS = {
  Beginner: 'bg-green-100 text-green-700 border-green-200',
  Intermediate: 'bg-amber-100 text-amber-700 border-amber-200',
  Advanced: 'bg-red-100 text-red-700 border-red-200',
};

const CATEGORIES = ['All', 'Programming', 'Frontend', 'Backend', 'Database', 'CS Fundamentals', 'AI/ML', 'Cloud', 'Architecture', 'Infrastructure'];

export default function SubjectInterviewsContent() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedDuration, setSelectedDuration] = useState<20 | 30 | 45 | 60>(20);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { balance, getCost } = useCreditBalance();
  const router = useRouter();

  const filtered = SUBJECTS.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || s.category === category;
    return matchSearch && matchCat;
  });

  const handleStart = (subject: Subject) => {
    if (!subject.available) return;
    setSelectedSubject(subject);
    setShowCreditModal(true);
  };

  return (
    <div className="fade-in">
      {showCreditModal && selectedSubject && (
        <CreditCheckModal
          operation={INTERVIEW_DURATION_OPERATIONS[selectedDuration]}
          balance={balance}
          onConfirm={() => { setShowCreditModal(false); router.push('/interview-setup'); }}
          onCancel={() => setShowCreditModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-800 text-[#0D1B3E]">Subject Mock Interviews</h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">Deep-dive practice by technology or subject area</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Zap size={14} className="text-amber-500" />
          <span className="text-xs font-700 text-amber-700">Default: 20 min session</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Subjects Available', value: SUBJECTS.filter(s => s.available).length, icon: <BookOpen size={16} className="text-teal-600" />, color: 'bg-teal-50' },
          { label: 'Total Questions', value: SUBJECTS.reduce((s, c) => s + c.totalQuestions, 0), icon: <Target size={16} className="text-blue-600" />, color: 'bg-blue-50' },
          { label: 'Categories', value: new Set(SUBJECTS.map(s => s.category)).size, icon: <Filter size={16} className="text-violet-600" />, color: 'bg-violet-50' },
          { label: 'Coming Soon', value: SUBJECTS.filter(s => !s.available).length, icon: <Clock size={16} className="text-amber-600" />, color: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}>{s.icon}</div>
            <div>
              <p className="text-lg font-800 text-[#0D1B3E]">{s.value}</p>
              <p className="text-xs text-[#6B7A99]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0D1B3E] placeholder-[#6B7A99] focus:outline-none focus:border-[#0D9488] transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-600 border whitespace-nowrap transition-all',
                category === cat ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]' : 'bg-white text-[#6B7A99] border-[#DDE3EE] hover:border-[#0D9488]',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Duration Selector */}
      <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-4 mb-6">
        <p className="text-xs font-700 text-[#6B7A99] uppercase tracking-wide mb-3">Session Duration</p>
        <div className="grid grid-cols-4 gap-2">
          {([20, 30, 45, 60] as const).map(d => {
            const op = INTERVIEW_DURATION_OPERATIONS[d];
            const cost = getCost(op);
            return (
              <button
                key={d}
                onClick={() => setSelectedDuration(d)}
                className={[
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                  selectedDuration === d ? 'border-[#0D9488] bg-teal-50' : 'border-[#E8ECF4] hover:border-[#0D9488]/40',
                ].join(' ')}
              >
                <span className={`text-sm font-800 ${selectedDuration === d ? 'text-[#0D9488]' : 'text-[#0D1B3E]'}`}>{d} min</span>
                <div className="flex items-center gap-0.5">
                  <Zap size={10} className="text-amber-500" />
                  <span className="text-[10px] font-600 text-[#6B7A99]">{cost} cr</span>
                </div>
                {d === 20 && <span className="text-[9px] font-700 text-teal-600 bg-teal-100 px-1.5 rounded-full">DEFAULT</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(subject => (
          <div key={subject.id}>
            {subject.available ? (
              <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm hover:shadow-md hover:border-[#0D9488]/30 transition-all duration-200 overflow-hidden group">
                <div className={`h-1.5 bg-gradient-to-r ${subject.color}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-sm`}>
                      {subject.icon}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {subject.popular && (
                        <span className="text-[9px] font-700 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">POPULAR</span>
                      )}
                      <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[subject.difficulty]}`}>
                        {subject.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-800 text-[#0D1B3E] mb-0.5">{subject.name}</h3>
                  <p className="text-xs text-[#6B7A99] mb-3">{subject.category}</p>

                  <div className="flex items-center gap-3 mb-3 text-[11px] text-[#6B7A99]">
                    <span className="flex items-center gap-1"><Target size={10} /> {subject.totalQuestions} questions</span>
                    {subject.rating && <span className="flex items-center gap-1"><Star size={10} className="text-amber-400" fill="currentColor" /> {subject.rating}</span>}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {subject.topics.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] font-600 bg-[#F4F6FA] text-[#6B7A99] px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                    {subject.topics.length > 3 && (
                      <span className="text-[10px] font-600 bg-[#F4F6FA] text-[#6B7A99] px-2 py-0.5 rounded-full">+{subject.topics.length - 3}</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleStart(subject)}
                    className="w-full flex items-center justify-center gap-2 bg-[#0D9488] hover:bg-[#0B7A6E] text-white text-xs font-700 py-2.5 rounded-xl transition-colors"
                  >
                    Start {selectedDuration}-min Interview
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <ComingSoon
                title={subject.name}
                description={`${subject.category} interview preparation`}
                adminNote="Content will become available after the administrator publishes this module."
                variant="card"
              />
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <BookOpen size={40} className="text-[#DDE3EE] mx-auto mb-3" />
          <p className="text-sm font-600 text-[#6B7A99]">No subjects match your search</p>
          <button onClick={() => { setSearch(''); setCategory('All'); }} className="mt-3 text-xs text-[#0D9488] hover:underline">Clear filters</button>
        </div>
      )}
    </div>
  );
}
