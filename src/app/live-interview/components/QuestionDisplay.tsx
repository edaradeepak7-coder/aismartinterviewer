import React from 'react';

interface Question {
  id: string;
  number: number;
  text: string;
  category: string;
  difficulty: string;
  technology?: string;
}

export type QuestionDisplayPhase = 'loading' | 'greeting' | 'question';

interface QuestionDisplayProps {
  question?: Question | null;
  questionNumber: number;
  totalQuestions: number;
  phase?: QuestionDisplayPhase;
  greetingText?: string;
}

const categoryColors: Record<string, string> = {
  Technical: 'bg-primary/20 text-blue-300 border border-primary/30',
  'Problem Solving': 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  Architecture: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  Behavioral: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  Experience: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  'Role Specific': 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
};

const difficultyColors: Record<string, string> = {
  Easy: 'text-emerald-400',
  Medium: 'text-amber-400',
  Hard: 'text-red-400',
};

export default function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  phase = 'question',
  greetingText,
}: QuestionDisplayProps) {
  if (phase === 'loading') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <p className="text-sm text-slate-400">Preparing your interview…</p>
      </div>
    );
  }

  if (phase === 'greeting') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm space-y-3">
        <p className="text-xs font-600 text-slate-400 uppercase tracking-wide">Welcome</p>
        <p className="text-base text-white leading-relaxed">{greetingText}</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <p className="text-sm text-slate-400">Waiting for the next question…</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-600 text-slate-400">
            Question {questionNumber} of {totalQuestions}
          </span>
          {question.technology && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              {question.technology}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${categoryColors[question.category] || 'bg-white/10 text-slate-300 border border-white/20'}`}>
            {question.category}
          </span>
          <span className={`text-[11px] font-600 ${difficultyColors[question.difficulty] || 'text-slate-400'}`}>
            {question.difficulty}
          </span>
        </div>
      </div>
      <p className="text-base text-white leading-relaxed">{question.text}</p>
    </div>
  );
}
