'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Headphones, Mic, BookOpen, PenLine, Loader2, Send } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

type Skill = 'listening' | 'speaking' | 'reading' | 'writing';

interface Exercise {
  id: string;
  skill: Skill;
  title: string;
  content: Record<string, unknown>;
  creditCost: number;
  bestScore: number | null;
  attempted: boolean;
}

const SKILL_CONFIG: Record<Skill, { label: string; icon: React.ReactNode; color: string }> = {
  listening: { label: 'Listening', icon: <Headphones size={16} />, color: 'text-blue-600' },
  speaking: { label: 'Speaking', icon: <Mic size={16} />, color: 'text-rose-600' },
  reading: { label: 'Reading', icon: <BookOpen size={16} />, color: 'text-teal-600' },
  writing: { label: 'Writing', icon: <PenLine size={16} />, color: 'text-amber-600' },
};

export default function LSRWContent() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [skillProgress, setSkillProgress] = useState<
    Record<string, { attempts: number; avgScore: number }>
  >({});
  const [skill, setSkill] = useState<Skill | 'all'>('all');
  const [active, setActive] = useState<Exercise | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/lsrw');
      if (res.status === 401) {
        setError('Sign in to practice LSRW.');
        setExercises([]);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load exercises');
        return;
      }
      setExercises(json.exercises || []);
      setSkillProgress(json.skillProgress || {});
    } catch {
      setError('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    skill === 'all' ? exercises : exercises.filter((e) => e.skill === skill);

  const handleSubmit = async () => {
    if (!active) return;
    setSubmitting(true);
    setError(null);
    try {
      // Simple client heuristic when content has no answer key
      const text = answer.trim();
      const heuristicScore = text.length === 0 ? 0 : Math.min(100, 40 + Math.min(60, text.length / 5));
      const res = await fetch('/api/lsrw', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ exerciseId: active.id, score: Math.round(heuristicScore) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Submit failed');
        return;
      }
      setLastScore(json.attempt?.score ?? Math.round(heuristicScore));
      setAnswer('');
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
        <h1 className="text-2xl font-bold text-[#0D1B3E]">LSRW Practice</h1>
        <p className="text-sm text-[#6B7A99] mt-0.5">
          Listening, Speaking, Reading & Writing exercises
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(SKILL_CONFIG) as Skill[]).map((s) => {
          const cfg = SKILL_CONFIG[s];
          const prog = skillProgress[s] || { attempts: 0, avgScore: 0 };
          return (
            <button
              key={s}
              onClick={() => {
                setSkill(s);
                setActive(null);
                setLastScore(null);
              }}
              className={[
                'rounded-xl border p-4 text-left transition-all',
                skill === s ? 'border-teal-400 bg-teal-50' : 'border-[#E8ECF4] bg-white',
              ].join(' ')}
            >
              <div className={`flex items-center gap-2 font-700 text-sm ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </div>
              <p className="text-[10px] text-[#6B7A99] mt-2">
                {prog.attempts} attempts · avg {prog.avgScore}%
              </p>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-teal-600" size={28} />
        </div>
      ) : active ? (
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 space-y-4">
          <button
            onClick={() => {
              setActive(null);
              setLastScore(null);
              setAnswer('');
            }}
            className="text-xs font-600 text-[#6B7A99] hover:text-teal-600"
          >
            ← Back to list
          </button>
          <h2 className="text-lg font-700 text-[#0D1B3E]">{active.title}</h2>
          <p className="text-sm text-[#6B7A99] whitespace-pre-wrap">
            {typeof active.content?.prompt === 'string'
              ? active.content.prompt
              : typeof active.content?.passage === 'string'
                ? active.content.passage
                : 'Complete this exercise and submit your response.'}
          </p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={6}
            placeholder="Type your response..."
            className="w-full border border-[#DDE3EE] rounded-xl p-3 text-sm outline-none focus:border-teal-500"
          />
          {lastScore != null && (
            <p className="text-sm font-700 text-teal-700">Last score: {lastScore}%</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submit attempt
            {active.creditCost > 0 ? ` (${active.creditCost} cr)` : ''}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#DDE3EE] rounded-2xl">
          <BookOpen size={36} className="text-[#C4CAD9] mx-auto mb-3" />
          <p className="text-sm font-600 text-[#6B7A99]">No exercises available yet</p>
          <p className="text-xs text-[#6B7A99] mt-1">
            LSRW exercises will show here when added by administrators.
          </p>
          {skill !== 'all' && (
            <button
              onClick={() => setSkill('all')}
              className="mt-3 text-xs text-teal-600 font-600 hover:underline"
            >
              Show all skills
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                setActive(ex);
                setLastScore(ex.bestScore);
                setAnswer('');
              }}
              className="text-left bg-white border border-[#E8ECF4] rounded-2xl p-5 hover:border-teal-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-700 capitalize ${SKILL_CONFIG[ex.skill].color}`}>
                  {ex.skill}
                </span>
                {ex.attempted && (
                  <span className="text-[10px] font-700 text-teal-700">
                    Best {ex.bestScore}%
                  </span>
                )}
              </div>
              <h3 className="text-sm font-700 text-[#0D1B3E]">{ex.title}</h3>
              {ex.creditCost > 0 && (
                <p className="text-[10px] text-amber-700 mt-2">{ex.creditCost} credits</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
