'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Code2, Play, RotateCcw, CheckCircle2, XCircle, ChevronRight, ArrowLeft, Zap, Award, Target, Terminal, Loader2, AlertCircle, Star, Filter, ChevronDown, ChevronUp, Cpu, BookOpen } from 'lucide-react';
import { useCreditBalance } from '@/lib/hooks/useCreditBalance';
import CreditCheckModal from '@/components/CreditCheckModal';

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Language = 'javascript' | 'python' | 'java' | 'cpp';
type View = 'list' | 'solve';
type Category = 'All' | 'Arrays' | 'Stack' | 'Sliding Window' | 'Trees' | 'Dynamic Programming' | 'Graphs' | 'Strings';

interface TestResult {
  input: string;
  expected: string;
  output: string;
  passed: boolean;
  runtime?: string;
  memory?: string;
}

interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  category: Category;
  acceptance: number;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starterCode: Record<Language, string>;
  testCases: { input: string; expected: string }[];
  xp: number;
  creditCost: number;
  solved?: boolean;
  hints: string[];
}

const PROBLEMS: Problem[] = [
  {
    id: 'p1', title: 'Two Sum', difficulty: 'Easy', category: 'Arrays', acceptance: 49, xp: 50, creditCost: 1,
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume each input has exactly one solution, and you may not use the same element twice.',
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] == 9' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
    ],
    constraints: ['2 ≤ nums.length ≤ 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹', 'Only one valid answer exists'],
    hints: ['Try using a hash map to store complements', 'For each number, check if target - num exists in the map'],
    testCases: [
      { input: '[2,7,11,15], 9', expected: '[0,1]' },
      { input: '[3,2,4], 6', expected: '[1,2]' },
      { input: '[3,3], 6', expected: '[0,1]' },
    ],
    starterCode: {
      javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Your solution here\n    \n}`,
      python: `def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n}`,
      cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your solution here\n        return {};\n    }\n};`,
    },
  },
  {
    id: 'p2', title: 'Valid Parentheses', difficulty: 'Easy', category: 'Stack', acceptance: 40, xp: 50, creditCost: 1,
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type and in the correct order.',
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    constraints: ['1 ≤ s.length ≤ 10⁴', 's consists of parentheses only'],
    hints: ['Use a stack to track opening brackets', 'When you see a closing bracket, check if it matches the top of the stack'],
    testCases: [
      { input: '"()"', expected: 'true' },
      { input: '"()[]{}"', expected: 'true' },
      { input: '"(]"', expected: 'false' },
    ],
    starterCode: {
      javascript: `function isValid(s) {\n    // Your solution here\n    \n}`,
      python: `def is_valid(s: str) -> bool:\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        // Your solution here\n        return false;\n    }\n}`,
      cpp: `class Solution {\npublic:\n    bool isValid(string s) {\n        // Your solution here\n        return false;\n    }\n};`,
    },
  },
  {
    id: 'p3', title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', category: 'Sliding Window', acceptance: 33, xp: 100, creditCost: 2,
    description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with length 3.' },
      { input: 's = "bbbbb"', output: '1' },
    ],
    constraints: ['0 ≤ s.length ≤ 5 × 10⁴'],
    hints: ['Use a sliding window with two pointers', 'Use a set to track characters in the current window'],
    testCases: [
      { input: '"abcabcbb"', expected: '3' },
      { input: '"bbbbb"', expected: '1' },
      { input: '"pwwkew"', expected: '3' },
    ],
    starterCode: {
      javascript: `function lengthOfLongestSubstring(s) {\n    // Your solution here\n    \n}`,
      python: `def length_of_longest_substring(s: str) -> int:\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Your solution here\n        return 0;\n    }\n}`,
      cpp: `class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Your solution here\n        return 0;\n    }\n};`,
    },
  },
  {
    id: 'p4', title: 'Merge Intervals', difficulty: 'Medium', category: 'Arrays', acceptance: 46, xp: 100, creditCost: 2,
    description: 'Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals and return an array of non-overlapping intervals.',
    examples: [
      { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]', explanation: '[1,3] and [2,6] overlap → merge to [1,6].' },
    ],
    constraints: ['1 ≤ intervals.length ≤ 10⁴'],
    hints: ['Sort intervals by start time', 'Compare current interval start with last merged interval end'],
    testCases: [
      { input: '[[1,3],[2,6],[8,10],[15,18]]', expected: '[[1,6],[8,10],[15,18]]' },
      { input: '[[1,4],[4,5]]', expected: '[[1,5]]' },
    ],
    starterCode: {
      javascript: `function merge(intervals) {\n    // Your solution here\n    \n}`,
      python: `def merge(intervals: list[list[int]]) -> list[list[int]]:\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int[][] merge(int[][] intervals) {\n        // Your solution here\n        return new int[][]{};\n    }\n}`,
      cpp: `class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        // Your solution here\n        return {};\n    }\n};`,
    },
  },
  {
    id: 'p5', title: 'Climbing Stairs', difficulty: 'Easy', category: 'Dynamic Programming', acceptance: 52, xp: 50, creditCost: 1,
    description: 'You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    examples: [
      { input: 'n = 2', output: '2', explanation: '1+1 or 2' },
      { input: 'n = 3', output: '3', explanation: '1+1+1, 1+2, 2+1' },
    ],
    constraints: ['1 ≤ n ≤ 45'],
    hints: ['This is essentially Fibonacci', 'dp[i] = dp[i-1] + dp[i-2]'],
    testCases: [
      { input: '2', expected: '2' },
      { input: '3', expected: '3' },
      { input: '5', expected: '8' },
    ],
    starterCode: {
      javascript: `function climbStairs(n) {\n    // Your solution here\n    \n}`,
      python: `def climb_stairs(n: int) -> int:\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int climbStairs(int n) {\n        // Your solution here\n        return 0;\n    }\n}`,
      cpp: `class Solution {\npublic:\n    int climbStairs(int n) {\n        // Your solution here\n        return 0;\n    }\n};`,
    },
  },
  {
    id: 'p6', title: 'Word Ladder', difficulty: 'Hard', category: 'Graphs', acceptance: 35, xp: 200, creditCost: 3,
    description: 'A transformation sequence from `beginWord` to `endWord` using a dictionary `wordList` is a sequence where every adjacent pair differs by a single letter. Return the number of words in the shortest transformation sequence, or 0 if none exists.',
    examples: [
      { input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]', output: '5', explanation: '"hit"→"hot"→"dot"→"dog"→"cog"' },
    ],
    constraints: ['1 ≤ beginWord.length ≤ 10'],
    hints: ['Use BFS for shortest path', 'Build a graph of words differing by one letter'],
    testCases: [
      { input: '"hit", "cog", ["hot","dot","dog","lot","log","cog"]', expected: '5' },
      { input: '"hit", "cog", ["hot","dot","dog","lot","log"]', expected: '0' },
    ],
    starterCode: {
      javascript: `function ladderLength(beginWord, endWord, wordList) {\n    // Your solution here\n    \n}`,
      python: `def ladder_length(begin_word: str, end_word: str, word_list: list[str]) -> int:\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int ladderLength(String beginWord, String endWord, List<String> wordList) {\n        // Your solution here\n        return 0;\n    }\n}`,
      cpp: `class Solution {\npublic:\n    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {\n        // Your solution here\n        return 0;\n    }\n};`,
    },
  },
];

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Medium: 'text-amber-600 bg-amber-50 border-amber-200',
  Hard: 'text-red-600 bg-red-50 border-red-200',
};

const LANGUAGES: { value: Language; label: string; color: string }[] = [
  { value: 'javascript', label: 'JavaScript', color: '#f7df1e' },
  { value: 'python', label: 'Python', color: '#3776ab' },
  { value: 'java', label: 'Java', color: '#ea580c' },
  { value: 'cpp', label: 'C++', color: '#00599c' },
];

const CATEGORIES: Category[] = ['All', 'Arrays', 'Stack', 'Sliding Window', 'Trees', 'Dynamic Programming', 'Graphs', 'Strings'];

export default function CodingAssessmentContent() {
  const { balance, canAfford } = useCreditBalance();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [pendingProblem, setPendingProblem] = useState<Problem | null>(null);
  const [view, setView] = useState<View>('list');
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [filterDiff, setFilterDiff] = useState<Difficulty | 'All'>('All');
  const [filterCat, setFilterCat] = useState<Category>('All');
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set(['p1']));
  const [showHints, setShowHints] = useState(false);
  const [activeTab, setActiveTab] = useState<'testcases' | 'results' | 'stats'>('testcases');
  const [sessionScore, setSessionScore] = useState(0);
  const [compileError, setCompileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openProblem = (p: Problem) => {
    if (!canAfford('codingAssessment')) {
      setPendingProblem(p);
      setShowCreditModal(true);
      return;
    }
    setSelectedProblem(p);
    setCode(p.starterCode[language]);
    setView('solve');
    setTestResults([]);
    setSubmitted(false);
    setCompileError(null);
    setShowHints(false);
    setActiveTab('testcases');
  };

  useEffect(() => {
    if (selectedProblem) setCode(selectedProblem.starterCode[language]);
  }, [language, selectedProblem]);

  const handleRun = () => {
    setRunning(true);
    setCompileError(null);
    setActiveTab('results');
    setTimeout(() => {
      if (selectedProblem) {
        // Simulate compilation check
        if (code.trim().length < 20) {
          setCompileError('SyntaxError: Unexpected end of input. Please write your solution before running.');
          setRunning(false);
          return;
        }
        const results: TestResult[] = selectedProblem.testCases.slice(0, 2).map(tc => ({
          input: tc.input,
          expected: tc.expected,
          output: tc.expected,
          passed: true,
          runtime: `${Math.floor(Math.random() * 80 + 20)}ms`,
          memory: `${(Math.random() * 5 + 40).toFixed(1)}MB`,
        }));
        setTestResults(results);
      }
      setRunning(false);
    }, 1400);
  };

  const handleSubmit = () => {
    setRunning(true);
    setCompileError(null);
    setActiveTab('results');
    setTimeout(() => {
      if (selectedProblem) {
        const results: TestResult[] = selectedProblem.testCases.map((tc, i) => {
          const passed = i < selectedProblem.testCases.length - 1 || Math.random() > 0.25;
          return {
            input: tc.input,
            expected: tc.expected,
            output: passed ? tc.expected : 'Wrong Answer',
            passed,
            runtime: `${Math.floor(Math.random() * 80 + 20)}ms`,
            memory: `${(Math.random() * 5 + 40).toFixed(1)}MB`,
          };
        });
        setTestResults(results);
        const allPassed = results.every(r => r.passed);
        if (allPassed) {
          setSolvedIds(prev => new Set([...prev, selectedProblem.id]));
          setSessionScore(prev => prev + selectedProblem.xp);
        }
        setSubmitted(true);
      }
      setRunning(false);
    }, 2200);
  };

  const filtered = PROBLEMS.filter(p => {
    const diffOk = filterDiff === 'All' || p.difficulty === filterDiff;
    const catOk = filterCat === 'All' || p.category === filterCat;
    return diffOk && catOk;
  });

  const allPassed = testResults.length > 0 && testResults.every(r => r.passed);

  // ── SOLVE VIEW ──
  if (view === 'solve' && selectedProblem) {
    return (
      <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 120px)' }}>
        {showCreditModal && (
          <CreditCheckModal operation="codingAssessment" balance={balance}
            onConfirm={() => { setShowCreditModal(false); if (pendingProblem) openProblem(pendingProblem); }}
            onCancel={() => { setShowCreditModal(false); setPendingProblem(null); }} />
        )}

        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => { setView('list'); setSelectedProblem(null); }}
            className="flex items-center gap-1.5 text-sm text-[#6B7A99] hover:text-[#0D1B3E] transition-colors">
            <ArrowLeft size={14} /> Problems
          </button>
          <span className="text-[#DDE3EE]">/</span>
          <span className="text-sm font-600 text-[#0D1B3E]">{selectedProblem.title}</span>
          <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[selectedProblem.difficulty]}`}>{selectedProblem.difficulty}</span>
          <span className="flex items-center gap-1 text-[10px] font-600 text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Zap size={9} />{selectedProblem.creditCost} credit{selectedProblem.creditCost > 1 ? 's' : ''}
          </span>
          {solvedIds.has(selectedProblem.id) && (
            <span className="flex items-center gap-1 text-[10px] font-600 text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={9} /> Solved
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <select value={language} onChange={e => setLanguage(e.target.value as Language)}
              className="text-xs font-600 border border-[#DDE3EE] rounded-lg px-2.5 py-1.5 text-[#3D5A80] focus:outline-none focus:border-[#0D9488] bg-white">
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <button onClick={handleRun} disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DDE3EE] rounded-lg text-xs font-600 text-[#3D5A80] hover:border-[#0D9488] hover:text-[#0D9488] disabled:opacity-50 transition-colors">
              {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run
            </button>
            <button onClick={handleSubmit} disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] text-white rounded-lg text-xs font-600 hover:bg-[#0b8276] disabled:opacity-50 transition-colors">
              {running ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />} Submit
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
          {/* Problem panel */}
          <div className="bg-white border border-[#DDE3EE] rounded-2xl overflow-y-auto">
            <div className="p-5 space-y-4">
              <div>
                <h2 className="font-700 text-[#0D1B3E] text-base mb-3">{selectedProblem.title}</h2>
                <p className="text-sm text-[#3D5A80] leading-relaxed whitespace-pre-line">{selectedProblem.description}</p>
              </div>
              <div>
                <p className="text-xs font-700 text-[#0D1B3E] uppercase tracking-wide mb-2">Examples</p>
                {selectedProblem.examples.map((ex, i) => (
                  <div key={i} className="bg-[#F8FAFC] border border-[#DDE3EE] rounded-xl p-3 mb-2">
                    <p className="text-xs font-600 text-[#6B7A99] mb-1">Example {i + 1}:</p>
                    <p className="text-xs font-mono text-[#0D1B3E]"><strong>Input:</strong> {ex.input}</p>
                    <p className="text-xs font-mono text-[#0D1B3E]"><strong>Output:</strong> {ex.output}</p>
                    {ex.explanation && <p className="text-xs text-[#6B7A99] mt-1"><strong>Explanation:</strong> {ex.explanation}</p>}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-700 text-[#0D1B3E] uppercase tracking-wide mb-2">Constraints</p>
                <ul className="space-y-1">
                  {selectedProblem.constraints.map((c, i) => (
                    <li key={i} className="text-xs text-[#3D5A80] flex items-start gap-1.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-[#0D9488] shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Hints */}
              <div>
                <button onClick={() => setShowHints(!showHints)}
                  className="flex items-center gap-1.5 text-xs font-600 text-amber-600 hover:text-amber-700 transition-colors">
                  💡 {showHints ? 'Hide' : 'Show'} Hints
                  {showHints ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showHints && (
                  <div className="mt-2 space-y-1.5">
                    {selectedProblem.hints.map((hint, i) => (
                      <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                        <strong>Hint {i + 1}:</strong> {hint}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor + output */}
          <div className="flex flex-col gap-3 min-h-0">
            {/* Editor */}
            <div className="flex-1 bg-[#0D1B3E] rounded-2xl overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <Terminal size={12} className="text-white/40 ml-1" />
                  <span className="text-xs font-600 text-white/60">{LANGUAGES.find(l => l.value === language)?.label}</span>
                </div>
                <button onClick={() => setCode(selectedProblem.starterCode[language])}
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                  <RotateCcw size={10} /> Reset
                </button>
              </div>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 p-4 bg-transparent text-[13px] font-mono text-[#A8D8B9] resize-none focus:outline-none leading-relaxed"
                style={{ tabSize: 2, minHeight: '200px' }}
                onKeyDown={e => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    const newCode = code.substring(0, start) + '  ' + code.substring(end);
                    setCode(newCode);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                      }
                    }, 0);
                  }
                }}
              />
            </div>

            {/* Output panel */}
            <div className="bg-white border border-[#DDE3EE] rounded-2xl overflow-hidden">
              {/* Output tabs */}
              <div className="flex border-b border-[#F4F6FA]">
                {(['testcases', 'results', 'stats'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`px-4 py-2.5 text-xs font-600 capitalize transition-colors border-b-2 ${activeTab === t ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'}`}>
                    {t === 'testcases' ? 'Test Cases' : t === 'results' ? 'Results' : 'Stats'}
                  </button>
                ))}
              </div>

              <div className="p-4 max-h-48 overflow-y-auto">
                {activeTab === 'testcases' && (
                  <div className="space-y-2">
                    {selectedProblem.testCases.map((tc, i) => (
                      <div key={i} className="bg-[#F8FAFC] border border-[#DDE3EE] rounded-xl p-2.5">
                        <p className="text-[10px] font-700 text-[#6B7A99] uppercase mb-1">Case {i + 1}</p>
                        <p className="text-xs font-mono text-[#3D5A80]">Input: {tc.input}</p>
                        <p className="text-xs font-mono text-[#3D5A80]">Expected: {tc.expected}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'results' && (
                  <div>
                    {running && (
                      <div className="flex items-center gap-2 text-sm text-[#6B7A99]">
                        <Loader2 size={14} className="animate-spin text-[#0D9488]" />
                        <span>Compiling and running test cases…</span>
                      </div>
                    )}
                    {compileError && !running && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                        <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-700 font-mono">{compileError}</p>
                      </div>
                    )}
                    {testResults.length > 0 && !running && (
                      <div className="space-y-2">
                        {submitted && (
                          <div className={`flex items-center gap-2 p-2.5 rounded-xl mb-2 ${allPassed ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                            {allPassed ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-red-500" />}
                            <span className={`text-xs font-700 ${allPassed ? 'text-emerald-700' : 'text-red-600'}`}>
                              {allPassed ? `✓ Accepted — +${selectedProblem.xp} XP earned!` : '✗ Wrong Answer — review your logic'}
                            </span>
                          </div>
                        )}
                        {testResults.map((r, i) => (
                          <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${r.passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
                            {r.passed ? <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" /> : <XCircle size={13} className="text-red-500 mt-0.5 shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <p className="font-600 text-[#0D1B3E]">Case {i + 1}: {r.passed ? 'Passed' : 'Failed'}</p>
                              <p className="text-[#6B7A99] font-mono mt-0.5 truncate">Input: {r.input}</p>
                              {!r.passed && <p className="text-red-600 font-mono">Expected: {r.expected} · Got: {r.output}</p>}
                            </div>
                            {r.runtime && (
                              <div className="text-right shrink-0">
                                <p className="text-[10px] text-[#9BA8C0]">{r.runtime}</p>
                                <p className="text-[10px] text-[#9BA8C0]">{r.memory}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {testResults.length === 0 && !running && !compileError && (
                      <p className="text-xs text-[#9BA8C0] text-center py-4">Run your code to see results</p>
                    )}
                  </div>
                )}

                {activeTab === 'stats' && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Session XP', value: `+${sessionScore}`, icon: <Zap size={13} className="text-amber-500" /> },
                      { label: 'Solved', value: `${solvedIds.size}/${PROBLEMS.length}`, icon: <CheckCircle2 size={13} className="text-emerald-500" /> },
                      { label: 'Language', value: LANGUAGES.find(l => l.value === language)?.label || '', icon: <Code2 size={13} className="text-blue-500" /> },
                    ].map(s => (
                      <div key={s.label} className="bg-[#F8FAFC] rounded-xl p-3 text-center">
                        <div className="flex justify-center mb-1">{s.icon}</div>
                        <p className="font-700 text-[#0D1B3E] text-sm">{s.value}</p>
                        <p className="text-[10px] text-[#9BA8C0]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="space-y-6">
      {showCreditModal && (
        <CreditCheckModal operation="codingAssessment" balance={balance}
          onConfirm={() => { setShowCreditModal(false); if (pendingProblem) { setSelectedProblem(pendingProblem); setCode(pendingProblem.starterCode[language]); setView('solve'); setTestResults([]); setSubmitted(false); } }}
          onCancel={() => { setShowCreditModal(false); setPendingProblem(null); }} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-sm">
              <Code2 size={17} className="text-emerald-400" />
            </div>
            <h1 className="text-xl font-700 text-[#0D1B3E]">Coding Arena</h1>
            <span className="flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-700 px-2 py-0.5 rounded-full">
              <Cpu size={9} /> Multi-language
            </span>
          </div>
          <p className="text-sm text-[#6B7A99]">Practice coding problems with real-time feedback. JS, Python, Java, C++.</p>
        </div>
        {sessionScore > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <p className="text-lg font-800 text-amber-600">+{sessionScore}</p>
            <p className="text-[10px] text-amber-500">XP this session</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Solved', value: `${solvedIds.size}/${PROBLEMS.length}`, icon: <CheckCircle2 size={14} className="text-emerald-500" />, sub: 'problems' },
          { label: 'Easy', value: `${PROBLEMS.filter(p => p.difficulty === 'Easy' && solvedIds.has(p.id)).length}/${PROBLEMS.filter(p => p.difficulty === 'Easy').length}`, icon: <Star size={14} className="text-emerald-500" />, sub: 'solved' },
          { label: 'Medium', value: `${PROBLEMS.filter(p => p.difficulty === 'Medium' && solvedIds.has(p.id)).length}/${PROBLEMS.filter(p => p.difficulty === 'Medium').length}`, icon: <Target size={14} className="text-amber-500" />, sub: 'solved' },
          { label: 'Hard', value: `${PROBLEMS.filter(p => p.difficulty === 'Hard' && solvedIds.has(p.id)).length}/${PROBLEMS.filter(p => p.difficulty === 'Hard').length}`, icon: <Award size={14} className="text-red-500" />, sub: 'solved' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-[#DDE3EE] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[#F4F6FA] flex items-center justify-center shrink-0">{stat.icon}</div>
              <p className="font-700 text-[#0D1B3E] text-base leading-tight">{stat.value}</p>
            </div>
            <p className="text-[10px] text-[#6B7A99]">{stat.label} · {stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-[#6B7A99]" />
          <span className="text-xs text-[#6B7A99] font-600">Difficulty:</span>
        </div>
        {(['All', 'Easy', 'Medium', 'Hard'] as const).map(d => (
          <button key={d} onClick={() => setFilterDiff(d)}
            className={`px-3 py-1 rounded-lg text-xs font-600 border transition-colors ${filterDiff === d ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-white border-[#DDE3EE] text-[#6B7A99] hover:border-[#0D9488]/40'}`}>
            {d}
          </button>
        ))}
        <div className="w-px h-4 bg-[#DDE3EE] mx-1" />
        <div className="flex items-center gap-1.5">
          <BookOpen size={12} className="text-[#6B7A99]" />
          <span className="text-xs text-[#6B7A99] font-600">Topic:</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-600 border transition-colors ${filterCat === c ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]' : 'bg-white border-[#DDE3EE] text-[#6B7A99] hover:border-[#0D9488]/40'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Problem list */}
      <div className="bg-white border border-[#DDE3EE] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 bg-[#F8FAFC] border-b border-[#DDE3EE] text-[10px] font-700 text-[#6B7A99] uppercase tracking-wide">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Title</div>
          <div className="col-span-2">Difficulty</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-1">Accept%</div>
          <div className="col-span-1">XP</div>
          <div className="col-span-1">Cost</div>
        </div>
        <div className="divide-y divide-[#F4F6FA]">
          {filtered.map(p => (
            <div key={p.id} onClick={() => openProblem(p)}
              className="grid grid-cols-12 px-4 py-3.5 hover:bg-[#F8FAFC] cursor-pointer transition-colors group items-center">
              <div className="col-span-1">
                {solvedIds.has(p.id)
                  ? <CheckCircle2 size={15} className="text-emerald-500" />
                  : <div className="w-4 h-4 rounded-full border-2 border-[#DDE3EE]" />}
              </div>
              <div className="col-span-4">
                <p className="text-sm font-600 text-[#0D1B3E] group-hover:text-[#0D9488] transition-colors">{p.title}</p>
              </div>
              <div className="col-span-2">
                <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[p.difficulty]}`}>{p.difficulty}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-[#6B7A99]">{p.category}</span>
              </div>
              <div className="col-span-1">
                <span className="text-xs text-[#6B7A99]">{p.acceptance}%</span>
              </div>
              <div className="col-span-1">
                <span className="text-xs font-600 text-amber-600 flex items-center gap-0.5"><Zap size={10} />{p.xp}</span>
              </div>
              <div className="col-span-1">
                <span className="text-xs font-600 text-teal-600 flex items-center gap-0.5"><Cpu size={10} />{p.creditCost}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[#9BA8C0]">No problems match the selected filters.</div>
          )}
        </div>
      </div>

      <div className="bg-[#F4F6FA] border border-[#DDE3EE] rounded-xl p-4 flex items-center gap-3">
        <AlertCircle size={14} className="text-[#6B7A99] shrink-0" />
        <p className="text-xs text-[#6B7A99]">
          Credit cost varies by difficulty: Easy = 1 credit, Medium = 2 credits, Hard = 3 credits.
          Supports <strong>JavaScript, Python, Java, C++</strong>. Test execution is simulated in-browser.
        </p>
      </div>
    </div>
  );
}
