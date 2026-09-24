'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Code2, Loader2, Play, CheckCircle2, ArrowLeft } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

interface Problem {
  id: string;
  title: string;
  difficulty: string;
  prompt: string;
  starterCode: string;
  testCount: number;
  solved: boolean;
  latestStatus: string | null;
  latestScore: number | null;
}

const DIFF_COLORS: Record<string, string> = {
  easy: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
};

export default function CodingAssessmentContent() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [active, setActive] = useState<Problem | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diffFilter, setDiffFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coding-assessment');
      if (res.status === 401) {
        setError('Sign in to view coding problems.');
        setProblems([]);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load problems');
        return;
      }
      setProblems(json.problems || []);
    } catch {
      setError('Failed to load problems');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    diffFilter === 'all'
      ? problems
      : problems.filter((p) => p.difficulty === diffFilter);

  const openProblem = (p: Problem) => {
    setActive(p);
    setCode(p.starterCode || '');
    setMessage(null);
  };

  const handleSubmit = async () => {
    if (!active) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/coding-assessment', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ problemId: active.id, code }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Submit failed');
        return;
      }
      setMessage(
        json.message ||
          `Stored as ${json.submission?.status ?? 'pending'} (score ${json.submission?.score ?? 0})`
      );
      await load();
    } catch {
      setError('Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D1B3E] flex items-center gap-2">
          <Code2 size={22} className="text-teal-600" /> Coding Assessment
        </h1>
        <p className="text-sm text-[#6B7A99] mt-0.5">
          Practice problems · submissions are stored (judge stub)
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-teal-600" size={28} />
        </div>
      ) : active ? (
        <div className="space-y-4">
          <button
            onClick={() => setActive(null)}
            className="inline-flex items-center gap-1 text-xs font-600 text-[#6B7A99] hover:text-teal-600"
          >
            <ArrowLeft size={12} /> All problems
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-700 text-[#0D1B3E]">{active.title}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-600 border capitalize ${DIFF_COLORS[active.difficulty] || DIFF_COLORS.easy}`}
                >
                  {active.difficulty}
                </span>
              </div>
              <p className="text-sm text-[#6B7A99] whitespace-pre-wrap">{active.prompt || 'No prompt.'}</p>
              <p className="text-[10px] text-[#6B7A99]">{active.testCount} test cases on server</p>
            </div>
            <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 space-y-3">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={16}
                className="w-full font-mono text-xs border border-[#DDE3EE] rounded-xl p-3 outline-none focus:border-teal-500 bg-[#0D1B3E] text-emerald-100"
                spellCheck={false}
              />
              {message && (
                <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                  {message}
                </p>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-700 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Submit
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {['all', 'easy', 'medium', 'hard'].map((d) => (
              <button
                key={d}
                onClick={() => setDiffFilter(d)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-600 border capitalize',
                  diffFilter === d
                    ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]'
                    : 'bg-white text-[#6B7A99] border-[#DDE3EE]',
                ].join(' ')}
              >
                {d}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#DDE3EE] rounded-2xl">
              <Code2 size={36} className="text-[#C4CAD9] mx-auto mb-3" />
              <p className="text-sm font-600 text-[#6B7A99]">No coding problems yet</p>
              <p className="text-xs text-[#6B7A99] mt-1">
                Problems will appear here when added by administrators.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F4F6FA] text-[10px] uppercase text-[#6B7A99]">
                    <th className="text-left px-4 py-3 font-600">Problem</th>
                    <th className="text-left px-4 py-3 font-600">Difficulty</th>
                    <th className="text-left px-4 py-3 font-600">Status</th>
                    <th className="text-right px-4 py-3 font-600" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t border-[#F0F3F9]">
                      <td className="px-4 py-3 font-600 text-[#0D1B3E]">{p.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-600 border capitalize ${DIFF_COLORS[p.difficulty] || ''}`}
                        >
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7A99]">
                        {p.solved ? (
                          <span className="text-teal-700 font-600 inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> Solved
                          </span>
                        ) : (
                          p.latestStatus || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openProblem(p)}
                          className="text-xs font-700 text-teal-600 hover:underline"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
