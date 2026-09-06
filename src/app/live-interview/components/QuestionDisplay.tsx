import React from 'react';
import { mockLiveInterview } from '@/lib/mockData';

type Question = (typeof mockLiveInterview.questions)[0];

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
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

export default function QuestionDisplay({ question, questionNumber, totalQuestions }: QuestionDisplayProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-[11px] font-600 px-2.5 py-0.5 rounded-full ${categoryColors[question.category] ?? 'bg-white/10 text-slate-300 border border-white/20'}`}>
          {question.category}
        </span>
        {question.technology && (
          <span className="text-[11px] font-500 px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
            {question.technology}
          </span>
        )}
        <span className={`text-[11px] font-500 ml-auto ${difficultyColors[question.difficulty]}`}>
          {question.difficulty}
        </span>
      </div>

      <p className="text-base font-500 text-white leading-relaxed">
        {question.text}
      </p>

      <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4 text-[12px] text-slate-400">
        <span>Question {questionNumber} of {totalQuestions}</span>
        <span>·</span>
        <span>Take your time — there's no rush</span>
      </div>
    </div>
  );
}