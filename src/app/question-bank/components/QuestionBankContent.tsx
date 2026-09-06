'use client';
import React, { useState, useRef } from 'react';
import { Search, Plus, Filter, Download, Upload, Code2, Mic, CheckSquare, Edit2, Trash2, Copy, Eye, ChevronDown, X, BookOpen, Building2, RefreshCw, GitBranch, Clock, CheckCircle2, FileText, AlertCircle, CheckCircle } from 'lucide-react';

type QuestionType = 'mcq' | 'coding' | 'interview';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Question {
  id: string;
  type: QuestionType;
  title: string;
  subject: string;
  company?: string;
  tags: string[];
  difficulty: Difficulty;
  version: number;
  reuseCount: number;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'draft' | 'archived';
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  codeTemplate?: string;
  expectedOutput?: string;
  sampleAnswer?: string;
  timeLimit?: number;
}

const MOCK_QUESTIONS: Question[] = [
  { id: 'q1', type: 'mcq', title: 'What is the time complexity of binary search?', subject: 'Data Structures', tags: ['algorithms', 'search', 'complexity'], difficulty: 'easy', version: 2, reuseCount: 47, createdAt: '2026-08-01', updatedAt: '2026-09-01', status: 'active', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctAnswer: 1, explanation: 'Binary search halves the search space each iteration.' },
  { id: 'q2', type: 'coding', title: 'Implement a function to reverse a linked list', subject: 'Data Structures', company: 'Google', tags: ['linked-list', 'pointers', 'recursion'], difficulty: 'medium', version: 3, reuseCount: 89, createdAt: '2026-07-15', updatedAt: '2026-09-02', status: 'active', codeTemplate: 'function reverseList(head) {\n  // Your code here\n}', expectedOutput: 'Reversed linked list node' },
  { id: 'q3', type: 'interview', title: 'Explain the SOLID principles with examples', subject: 'OOP', company: 'Microsoft', tags: ['design-patterns', 'oop', 'architecture'], difficulty: 'medium', version: 1, reuseCount: 34, createdAt: '2026-08-10', updatedAt: '2026-08-10', status: 'active', sampleAnswer: 'SOLID stands for Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion...' },
  { id: 'q4', type: 'mcq', title: 'Which HTTP method is idempotent?', subject: 'Web Development', tags: ['http', 'rest', 'api'], difficulty: 'easy', version: 1, reuseCount: 22, createdAt: '2026-08-20', updatedAt: '2026-08-20', status: 'active', options: ['POST', 'PUT', 'PATCH', 'DELETE'], correctAnswer: 1 },
  { id: 'q5', type: 'coding', title: 'Find the longest common subsequence', subject: 'Dynamic Programming', company: 'Amazon', tags: ['dp', 'strings', 'optimization'], difficulty: 'hard', version: 2, reuseCount: 61, createdAt: '2026-07-20', updatedAt: '2026-09-03', status: 'active', codeTemplate: 'function lcs(s1, s2) {\n  // Your code here\n}' },
  { id: 'q6', type: 'interview', title: 'How would you design a URL shortener?', subject: 'System Design', company: 'Flipkart', tags: ['system-design', 'scalability', 'databases'], difficulty: 'hard', version: 1, reuseCount: 78, createdAt: '2026-08-05', updatedAt: '2026-08-05', status: 'active' },
  { id: 'q7', type: 'mcq', title: 'What is the difference between == and === in JavaScript?', subject: 'JavaScript', tags: ['js', 'type-coercion', 'equality'], difficulty: 'easy', version: 1, reuseCount: 103, createdAt: '2026-07-01', updatedAt: '2026-07-01', status: 'active', options: ['No difference', '=== checks type too', '== checks type too', 'Both are same'], correctAnswer: 1 },
  { id: 'q8', type: 'coding', title: 'Implement LRU Cache', subject: 'Data Structures', company: 'Infosys', tags: ['cache', 'hashmap', 'linked-list'], difficulty: 'hard', version: 4, reuseCount: 55, createdAt: '2026-06-15', updatedAt: '2026-09-04', status: 'active' },
  { id: 'q9', type: 'interview', title: 'Describe your experience with microservices architecture', subject: 'Architecture', tags: ['microservices', 'distributed-systems', 'devops'], difficulty: 'medium', version: 1, reuseCount: 19, createdAt: '2026-08-25', updatedAt: '2026-08-25', status: 'draft' },
  { id: 'q10', type: 'mcq', title: 'What is a deadlock in operating systems?', subject: 'Operating Systems', tags: ['os', 'concurrency', 'deadlock'], difficulty: 'medium', version: 2, reuseCount: 38, createdAt: '2026-07-10', updatedAt: '2026-08-15', status: 'active', options: ['Process waiting indefinitely', 'Memory overflow', 'CPU starvation', 'Thread collision'], correctAnswer: 0 },
];

const SUBJECTS = ['All Subjects', 'Data Structures', 'Algorithms', 'OOP', 'Web Development', 'Dynamic Programming', 'System Design', 'JavaScript', 'Operating Systems', 'Architecture'];
const COMPANIES = ['All Companies', 'Google', 'Microsoft', 'Amazon', 'Flipkart', 'Infosys', 'TCS', 'Wipro'];
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
};
const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  mcq: <CheckSquare size={13} className="text-blue-500" />,
  coding: <Code2 size={13} className="text-violet-500" />,
  interview: <Mic size={13} className="text-teal-500" />,
};
const TYPE_COLORS: Record<QuestionType, string> = {
  mcq: 'bg-blue-50 text-blue-700 border-blue-200',
  coding: 'bg-violet-50 text-violet-700 border-violet-200',
  interview: 'bg-teal-50 text-teal-700 border-teal-200',
};

interface QuestionFormData {
  type: QuestionType;
  title: string;
  subject: string;
  company: string;
  tags: string;
  difficulty: Difficulty;
  options: string[];
  correctAnswer: number;
  explanation: string;
  codeTemplate: string;
  expectedOutput: string;
  sampleAnswer: string;
}

const DEFAULT_FORM: QuestionFormData = {
  type: 'mcq', title: '', subject: '', company: '', tags: '', difficulty: 'medium',
  options: ['', '', '', ''], correctAnswer: 0, explanation: '', codeTemplate: '', expectedOutput: '', sampleAnswer: '',
};

// CSV auto-mapping helpers
const SUBJECT_KEYWORDS: Record<string, string> = {
  'data structure': 'Data Structures', 'algorithm': 'Algorithms', 'oop': 'OOP', 'object oriented': 'OOP',
  'web': 'Web Development', 'dynamic programming': 'Dynamic Programming', 'dp': 'Dynamic Programming',
  'system design': 'System Design', 'javascript': 'JavaScript', 'js': 'JavaScript',
  'operating system': 'Operating Systems', 'os': 'Operating Systems', 'architecture': 'Architecture',
};

const COMPANY_KEYWORDS: Record<string, string> = {
  'google': 'Google', 'microsoft': 'Microsoft', 'amazon': 'Amazon', 'flipkart': 'Flipkart',
  'infosys': 'Infosys', 'tcs': 'TCS', 'wipro': 'Wipro',
};

function autoMapSubject(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(SUBJECT_KEYWORDS)) {
    if (lower.includes(key)) return val;
  }
  return raw || 'General';
}

function autoMapCompany(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(COMPANY_KEYWORDS)) {
    if (lower.includes(key)) return val;
  }
  return raw || '';
}

function autoMapDifficulty(raw: string): Difficulty {
  const lower = raw.toLowerCase();
  if (lower.includes('hard') || lower.includes('difficult') || lower.includes('advanced')) return 'hard';
  if (lower.includes('easy') || lower.includes('beginner') || lower.includes('basic')) return 'easy';
  return 'medium';
}

function autoMapType(raw: string): QuestionType {
  const lower = raw.toLowerCase();
  if (lower.includes('cod') || lower.includes('program') || lower.includes('implement')) return 'coding';
  if (lower.includes('interview') || lower.includes('behavioral') || lower.includes('explain')) return 'interview';
  return 'mcq';
}

interface CSVImportResult {
  success: number;
  failed: number;
  questions: Question[];
  errors: string[];
}

function parseCSV(text: string): CSVImportResult {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return { success: 0, failed: 0, questions: [], errors: ['CSV must have a header row and at least one data row'] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const questions: Question[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      const title = row['title'] || row['question'] || row['text'] || '';
      if (!title) { errors.push(`Row ${i + 1}: Missing question title`); continue; }

      const q: Question = {
        id: `csv_${Date.now()}_${i}`,
        type: autoMapType(row['type'] || row['question_type'] || title),
        title,
        subject: autoMapSubject(row['subject'] || row['topic'] || row['category'] || ''),
        company: autoMapCompany(row['company'] || row['organization'] || ''),
        tags: (row['tags'] || row['keywords'] || '').split(';').map(t => t.trim().toLowerCase()).filter(Boolean),
        difficulty: autoMapDifficulty(row['difficulty'] || row['level'] || ''),
        version: 1,
        reuseCount: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        status: 'draft',
        options: row['options'] ? row['options'].split('|').map(o => o.trim()) : undefined,
        correctAnswer: row['correct_answer'] ? parseInt(row['correct_answer']) : undefined,
        explanation: row['explanation'] || undefined,
        codeTemplate: row['code_template'] || row['template'] || undefined,
        sampleAnswer: row['sample_answer'] || row['answer'] || undefined,
      };
      questions.push(q);
    } catch {
      errors.push(`Row ${i + 1}: Parse error`);
    }
  }

  return { success: questions.length, failed: errors.length, questions, errors };
}

export default function QuestionBankContent() {
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');
  const [companyFilter, setCompanyFilter] = useState('All Companies');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionFormData>(DEFAULT_FORM);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  // CSV Import state
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvDragOver, setCSVDragOver] = useState(false);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [csvResult, setCSVResult] = useState<CSVImportResult | null>(null);
  const [csvStep, setCSVStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = questions.filter(q => {
    if (search && !q.title.toLowerCase().includes(search.toLowerCase()) && !q.tags.some(t => t.includes(search.toLowerCase()))) return false;
    if (typeFilter !== 'all' && q.type !== typeFilter) return false;
    if (subjectFilter !== 'All Subjects' && q.subject !== subjectFilter) return false;
    if (companyFilter !== 'All Companies' && q.company !== companyFilter) return false;
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: questions.length,
    mcq: questions.filter(q => q.type === 'mcq').length,
    coding: questions.filter(q => q.type === 'coding').length,
    interview: questions.filter(q => q.type === 'interview').length,
    active: questions.filter(q => q.status === 'active').length,
  };

  function openCreate() {
    setEditingQuestion(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  }

  function openEdit(q: Question) {
    setEditingQuestion(q);
    setForm({
      type: q.type, title: q.title, subject: q.subject, company: q.company ?? '',
      tags: q.tags.join(', '), difficulty: q.difficulty,
      options: q.options ?? ['', '', '', ''], correctAnswer: q.correctAnswer ?? 0,
      explanation: q.explanation ?? '', codeTemplate: q.codeTemplate ?? '',
      expectedOutput: q.expectedOutput ?? '', sampleAnswer: q.sampleAnswer ?? '',
    });
    setShowModal(true);
  }

  function saveQuestion() {
    if (!form.title.trim() || !form.subject.trim()) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editingQuestion) {
      setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? {
        ...q, ...form, tags, version: q.version + 1, updatedAt: new Date().toISOString().slice(0, 10),
        options: form.type === 'mcq' ? form.options : undefined,
        correctAnswer: form.type === 'mcq' ? form.correctAnswer : undefined,
      } : q));
    } else {
      const newQ: Question = {
        id: `q${Date.now()}`, ...form, tags, version: 1, reuseCount: 0,
        createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10),
        status: 'draft',
        options: form.type === 'mcq' ? form.options : undefined,
        correctAnswer: form.type === 'mcq' ? form.correctAnswer : undefined,
      };
      setQuestions(prev => [newQ, ...prev]);
    }
    setShowModal(false);
  }

  function deleteQuestion(id: string) {
    setQuestions(prev => prev.filter(q => q.id !== id));
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  function duplicateQuestion(q: Question) {
    const copy: Question = { ...q, id: `q${Date.now()}`, title: `${q.title} (Copy)`, version: 1, reuseCount: 0, status: 'draft', createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) };
    setQuestions(prev => [copy, ...prev]);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function selectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(q => q.id)));
  }

  function applyBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return;
    if (bulkAction === 'delete') {
      setQuestions(prev => prev.filter(q => !selectedIds.has(q.id)));
      setSelectedIds(new Set());
    } else if (bulkAction === 'archive') {
      setQuestions(prev => prev.map(q => selectedIds.has(q.id) ? { ...q, status: 'archived' as const } : q));
      setSelectedIds(new Set());
    } else if (bulkAction === 'activate') {
      setQuestions(prev => prev.map(q => selectedIds.has(q.id) ? { ...q, status: 'active' as const } : q));
      setSelectedIds(new Set());
    }
    setBulkAction('');
  }

  // CSV handlers
  function openCSVModal() {
    setCSVFile(null);
    setCSVResult(null);
    setCSVStep('upload');
    setShowCSVModal(true);
  }

  function handleCSVFile(file: File) {
    if (!file.name.endsWith('.csv')) return;
    setCSVFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      setCSVResult(result);
      setCSVStep('preview');
    };
    reader.readAsText(file);
  }

  function handleCSVDrop(e: React.DragEvent) {
    e.preventDefault();
    setCSVDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCSVFile(file);
  }

  function confirmCSVImport() {
    if (!csvResult) return;
    setQuestions(prev => [...csvResult.questions, ...prev]);
    setCSVStep('done');
  }

  function closeCSVModal() {
    setShowCSVModal(false);
    setCSVFile(null);
    setCSVResult(null);
    setCSVStep('upload');
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-700 text-foreground">Question Bank</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Centralized repository for MCQ, coding, and interview questions with versioning and reuse tracking</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={openCSVModal} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[40px]">
            <Upload size={14} /> CSV Import
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[40px]">
            <Download size={14} /> Export
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors min-h-[40px]">
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: <BookOpen size={15} />, color: 'text-foreground', bg: 'bg-muted/50' },
          { label: 'MCQ', value: stats.mcq, icon: <CheckSquare size={15} />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Coding', value: stats.coding, icon: <Code2 size={15} />, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Interview', value: stats.interview, icon: <Mic size={15} />, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Active', value: stats.active, icon: <CheckCircle2 size={15} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div><p className="text-lg font-700 text-foreground">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search questions, tags..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[44px]" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'mcq', 'coding', 'interview'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[40px] ${typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                {t === 'all' ? 'All Types' : t.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors min-h-[40px] ${showFilters ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            <Filter size={14} /> Filters <ChevronDown size={12} className={showFilters ? 'rotate-180' : ''} />
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]">
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]">
              {COMPANIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value as Difficulty | 'all')} className="px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]">
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl flex-wrap">
          <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none min-h-[40px]">
            <option value="">Bulk Action...</option>
            <option value="activate">Activate</option>
            <option value="archive">Archive</option>
            <option value="delete">Delete</option>
          </select>
          <button onClick={applyBulkAction} disabled={!bulkAction} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors min-h-[40px]">Apply</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-muted-foreground hover:text-foreground p-1.5 min-h-[40px] min-w-[40px] flex items-center justify-center"><X size={16} /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={selectAll} className="rounded border-border" /></th>
                <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide w-10">S.No</th>
                <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Question</th>
                <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Difficulty</th>
                <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Version</th>
                <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Reuse</th>
                <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, idx) => (
                <tr key={q.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleSelect(q.id)} className="rounded border-border" /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-600">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-[320px]">
                      <p className="text-sm font-500 text-foreground truncate">{q.title}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {q.company && <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"><Building2 size={9} /> {q.company}</span>}
                        {q.tags.slice(0, 2).map(tag => <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{tag}</span>)}
                        {q.tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{q.tags.length - 2}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-500 border ${TYPE_COLORS[q.type]}`}>{TYPE_ICONS[q.type]} {q.type.toUpperCase()}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{q.subject}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs font-500 border capitalize ${DIFFICULTY_COLORS[q.difficulty]}`}>{q.difficulty}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs text-muted-foreground"><GitBranch size={11} /> v{q.version}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs text-muted-foreground"><RefreshCw size={11} /> {q.reuseCount}x</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs font-500 capitalize ${q.status === 'active' ? 'bg-emerald-50 text-emerald-700' : q.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-muted text-muted-foreground'}`}>{q.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setPreviewQuestion(q)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center" title="Preview"><Eye size={14} /></button>
                      <button onClick={() => openEdit(q)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => duplicateQuestion(q)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center" title="Duplicate"><Copy size={14} /></button>
                      <button onClick={() => deleteQuestion(q.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No questions match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {questions.length} questions</p>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-primary" />
                <h2 className="text-base font-700 text-foreground">CSV Bulk Import</h2>
              </div>
              <button onClick={closeCSVModal} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"><X size={16} /></button>
            </div>

            {csvStep === 'upload' && (
              <div className="p-5 space-y-5">
                {/* Format guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={15} className="text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-700 text-blue-800 mb-1">CSV Format Guide</p>
                      <p className="text-xs text-blue-700 mb-2">Required column: <code className="bg-blue-100 px-1 rounded">title</code> or <code className="bg-blue-100 px-1 rounded">question</code></p>
                      <p className="text-xs text-blue-700 mb-1">Optional columns (auto-mapped):</p>
                      <div className="flex flex-wrap gap-1">
                        {['type', 'subject', 'company', 'difficulty', 'tags', 'options', 'correct_answer', 'explanation', 'code_template', 'sample_answer'].map(c => (
                          <code key={c} className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{c}</code>
                        ))}
                      </div>
                      <p className="text-xs text-blue-600 mt-2">• <strong>subject/company/difficulty</strong> are auto-mapped from keywords<br />• Multiple options separated by <code className="bg-blue-100 px-1 rounded">|</code> pipe character<br />• Multiple tags separated by <code className="bg-blue-100 px-1 rounded">;</code> semicolon</p>
                    </div>
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setCSVDragOver(true); }}
                  onDragLeave={() => setCSVDragOver(false)}
                  onDrop={handleCSVDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${csvDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
                >
                  <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-600 text-foreground mb-1">Drop your CSV file here</p>
                  <p className="text-xs text-muted-foreground">or click to browse · .csv files only</p>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); }} />
                </div>

                {/* Sample CSV download */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
                  <div>
                    <p className="text-xs font-600 text-foreground">Download Sample CSV</p>
                    <p className="text-[10px] text-muted-foreground">Template with all supported columns</p>
                  </div>
                  <button
                    onClick={() => {
                      const csv = 'title,type,subject,company,difficulty,tags,options,correct_answer,explanation\n"What is React?",mcq,JavaScript,Google,easy,"react;frontend","A library|A framework|A language|A database",0,"React is a JavaScript library for building UIs"\n"Implement binary search",coding,Algorithms,Amazon,medium,"algorithms;search",,,""\n"Explain SOLID principles",interview,OOP,Microsoft,hard,"oop;design",,,""\n';
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'question_bank_template.csv'; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors min-h-[40px]"
                  >
                    <Download size={13} /> Template
                  </button>
                </div>
              </div>
            )}

            {csvStep === 'preview' && csvResult && (
              <div className="p-5 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <p className="text-xl font-800 text-emerald-700">{csvResult.success}</p>
                    <p className="text-xs text-emerald-600">Ready to import</p>
                  </div>
                  <div className={`${csvResult.failed > 0 ? 'bg-red-50 border-red-200' : 'bg-muted/30 border-border'} border rounded-xl p-3 text-center`}>
                    <p className={`text-xl font-800 ${csvResult.failed > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{csvResult.failed}</p>
                    <p className={`text-xs ${csvResult.failed > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>Failed rows</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-xl font-800 text-blue-700">{csvFile?.name.slice(0, 12)}{(csvFile?.name.length ?? 0) > 12 ? '…' : ''}</p>
                    <p className="text-xs text-blue-600">File</p>
                  </div>
                </div>

                {/* Auto-mapping summary */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-700 text-amber-800 mb-2">Auto-Mapping Applied</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-amber-700">
                    <div><span className="font-600">MCQ:</span> {csvResult.questions.filter(q => q.type === 'mcq').length}</div>
                    <div><span className="font-600">Coding:</span> {csvResult.questions.filter(q => q.type === 'coding').length}</div>
                    <div><span className="font-600">Interview:</span> {csvResult.questions.filter(q => q.type === 'interview').length}</div>
                  </div>
                </div>

                {/* Errors */}
                {csvResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-24 overflow-y-auto">
                    <p className="text-xs font-700 text-red-700 mb-1">Errors ({csvResult.errors.length})</p>
                    {csvResult.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                  </div>
                )}

                {/* Preview table */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs min-w-[500px]">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-600 text-muted-foreground">Title</th>
                          <th className="text-left px-3 py-2 font-600 text-muted-foreground">Type</th>
                          <th className="text-left px-3 py-2 font-600 text-muted-foreground">Subject</th>
                          <th className="text-left px-3 py-2 font-600 text-muted-foreground">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvResult.questions.slice(0, 10).map((q, i) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="px-3 py-2 text-foreground max-w-[200px] truncate">{q.title}</td>
                            <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-500 ${TYPE_COLORS[q.type]}`}>{q.type}</span></td>
                            <td className="px-3 py-2 text-muted-foreground">{q.subject}</td>
                            <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-500 capitalize ${DIFFICULTY_COLORS[q.difficulty]}`}>{q.difficulty}</span></td>
                          </tr>
                        ))}
                        {csvResult.questions.length > 10 && <tr><td colSpan={4} className="px-3 py-2 text-center text-muted-foreground">+{csvResult.questions.length - 10} more rows</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setCSVStep('upload')} className="flex-1 py-3 text-sm font-600 text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors min-h-[48px]">Back</button>
                  <button onClick={confirmCSVImport} disabled={csvResult.success === 0} className="flex-1 py-3 text-sm font-600 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[48px]">
                    Import {csvResult.success} Questions
                  </button>
                </div>
              </div>
            )}

            {csvStep === 'done' && csvResult && (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-700 text-foreground">Import Successful!</p>
                  <p className="text-sm text-muted-foreground mt-1">{csvResult.success} questions added to the Question Bank as drafts</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-700 text-foreground">{csvResult.questions.filter(q => q.type === 'mcq').length}</p><p className="text-xs text-muted-foreground">MCQ</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-700 text-foreground">{csvResult.questions.filter(q => q.type === 'coding').length}</p><p className="text-xs text-muted-foreground">Coding</p></div>
                  <div className="bg-muted/30 rounded-xl p-3"><p className="font-700 text-foreground">{csvResult.questions.filter(q => q.type === 'interview').length}</p><p className="text-xs text-muted-foreground">Interview</p></div>
                </div>
                <button onClick={closeCSVModal} className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 transition-colors min-h-[48px]">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border">
              <h2 className="text-base font-700 text-foreground">{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Question Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as QuestionType }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]">
                    <option value="mcq">MCQ</option><option value="coding">Coding</option><option value="interview">Interview</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]">
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Question Title *</label>
                <textarea value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} rows={2} placeholder="Enter the question text..." className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Subject *</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Data Structures" className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]" />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Company (optional)</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Google" className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. algorithms, sorting, arrays" className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]" />
              </div>
              {form.type === 'mcq' && (
                <div className="space-y-3">
                  <label className="block text-xs font-600 text-muted-foreground uppercase tracking-wide">Answer Options</label>
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={form.correctAnswer === i} onChange={() => setForm(f => ({ ...f, correctAnswer: i }))} className="shrink-0" />
                      <input value={opt} onChange={e => setForm(f => ({ ...f, options: f.options.map((o, j) => j === i ? e.target.value : o) }))} placeholder={`Option ${i + 1}`} className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[40px]" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Explanation</label>
                    <textarea value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} rows={2} placeholder="Explain the correct answer..." className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  </div>
                </div>
              )}
              {form.type === 'coding' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Code Template</label>
                    <textarea value={form.codeTemplate} onChange={e => setForm(f => ({ ...f, codeTemplate: e.target.value }))} rows={4} placeholder="function solution() {\n  // starter code\n}" className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Expected Output</label>
                    <input value={form.expectedOutput} onChange={e => setForm(f => ({ ...f, expectedOutput: e.target.value }))} placeholder="Describe expected output..." className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]" />
                  </div>
                </div>
              )}
              {form.type === 'interview' && (
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">Sample Answer / Rubric</label>
                  <textarea value={form.sampleAnswer} onChange={e => setForm(f => ({ ...f, sampleAnswer: e.target.value }))} rows={4} placeholder="Describe what a good answer looks like..." className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 sm:p-6 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px]">Cancel</button>
              <button onClick={saveQuestion} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px]">{editingQuestion ? 'Save Changes' : 'Add Question'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border">
              <div className="flex items-center gap-2">{TYPE_ICONS[previewQuestion.type]}<h2 className="text-base font-700 text-foreground">Question Preview</h2></div>
              <button onClick={() => setPreviewQuestion(null)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 rounded-md text-xs font-500 border ${TYPE_COLORS[previewQuestion.type]}`}>{previewQuestion.type.toUpperCase()}</span>
                <span className={`px-2 py-1 rounded-md text-xs font-500 border capitalize ${DIFFICULTY_COLORS[previewQuestion.difficulty]}`}>{previewQuestion.difficulty}</span>
                <span className="text-xs text-muted-foreground">{previewQuestion.subject}</span>
                {previewQuestion.company && <span className="text-xs text-muted-foreground">• {previewQuestion.company}</span>}
                <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1"><GitBranch size={10} /> v{previewQuestion.version}</span>
              </div>
              <p className="text-sm font-500 text-foreground">{previewQuestion.title}</p>
              {previewQuestion.type === 'mcq' && previewQuestion.options && (
                <div className="space-y-2">
                  {previewQuestion.options.map((opt, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${i === previewQuestion.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-border text-muted-foreground'}`}>
                      <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-600">{String.fromCharCode(65 + i)}</span>
                      {opt || `Option ${i + 1}`}
                      {i === previewQuestion.correctAnswer && <CheckCircle2 size={13} className="ml-auto" />}
                    </div>
                  ))}
                  {previewQuestion.explanation && <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">{previewQuestion.explanation}</p>}
                </div>
              )}
              {previewQuestion.type === 'coding' && previewQuestion.codeTemplate && <pre className="bg-muted/50 p-3 rounded-lg text-xs font-mono text-foreground overflow-x-auto">{previewQuestion.codeTemplate}</pre>}
              {previewQuestion.type === 'interview' && previewQuestion.sampleAnswer && <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{previewQuestion.sampleAnswer}</p>}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><RefreshCw size={10} /> Used {previewQuestion.reuseCount} times</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> Updated {previewQuestion.updatedAt}</span>
                <div className="flex gap-1 ml-auto flex-wrap">{previewQuestion.tags.map(t => <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">#{t}</span>)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
