'use client';
import React from 'react';
import { TrendingUp, Brain, MessageCircle, Users, Star, CheckCircle } from 'lucide-react';
import type { QAPair, EvaluationScore } from './RecruiterInterviewScreen';
import Icon from '@/components/ui/AppIcon';


interface LiveEvaluationPanelProps {
  qaHistory: QAPair[];
  evaluationScores: EvaluationScore;
  isEvaluating: boolean;
  questionNumber: number;
  totalQuestions: number;
}

function ScoreBar({ label, score, icon: Icon, color }: { label: string; score: number; icon: React.ElementType; color: string }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={11} className={color} />
          <span className="text-[11px] text-[#7A9BAA]">{label}</span>
        </div>
        <span className={`text-[12px] font-700 ${score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : score > 0 ? 'text-red-400' : 'text-[#3A5060]'}`}>
          {score > 0 ? `${score}/10` : '—'}
        </span>
      </div>
      <div className="h-1.5 bg-[#1E2D3D] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${score >= 7 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : score > 0 ? 'bg-red-500' : 'bg-[#1E2D3D]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function LiveEvaluationPanel({
  qaHistory, evaluationScores, isEvaluating, questionNumber, totalQuestions,
}: LiveEvaluationPanelProps) {
  const progress = Math.round((qaHistory.length / totalQuestions) * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1E2D3D] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md bg-[#F5A623]/20 flex items-center justify-center">
            <Brain size={13} className="text-[#F5A623]" />
          </div>
          <span className="text-[13px] font-700 text-[#C8A87E]">Live Evaluation</span>
          {isEvaluating && (
            <div className="flex gap-0.5 ml-auto">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-[#F5A623] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          )}
        </div>
        <p className="text-[10px] text-[#3A5060]">GPT/Groq real-time scoring · Recruiter only</p>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-[#1E2D3D] shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[#4A6B7A]">Interview Progress</span>
          <span className="text-[11px] font-600 text-[#7EC8C8]">{qaHistory.length}/{totalQuestions}</span>
        </div>
        <div className="h-2 bg-[#1E2D3D] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2ABFBF] to-[#1A8F8F] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-[#3A5060] mt-1">{progress}% complete</p>
      </div>

      {/* Score breakdown */}
      <div className="px-4 py-3 border-b border-[#1E2D3D] space-y-3 shrink-0">
        <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider">Score Breakdown</p>
        <ScoreBar label="Communication" score={evaluationScores.communication} icon={MessageCircle} color="text-blue-400" />
        <ScoreBar label="Technical" score={evaluationScores.technical} icon={Brain} color="text-purple-400" />
        <ScoreBar label="Problem Solving" score={evaluationScores.problemSolving} icon={TrendingUp} color="text-amber-400" />
        <ScoreBar label="Cultural Fit" score={evaluationScores.cultural} icon={Users} color="text-emerald-400" />

        {/* Overall */}
        <div className="pt-2 border-t border-[#1E2D3D]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star size={13} className="text-[#F5A623]" />
              <span className="text-[12px] font-700 text-[#C8A87E]">Overall Score</span>
            </div>
            <span className={`text-[16px] font-800 ${
              evaluationScores.overall >= 7 ? 'text-emerald-400' :
              evaluationScores.overall >= 5 ? 'text-amber-400' :
              evaluationScores.overall > 0 ? 'text-red-400' : 'text-[#3A5060]'
            }`}>
              {evaluationScores.overall > 0 ? `${evaluationScores.overall}/10` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent evaluations */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2">Recent Evaluations</p>
        {qaHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <CheckCircle size={20} className="text-[#1E2D3D] mb-2" />
            <p className="text-[11px] text-[#3A5060]">Evaluations appear after each Q&A</p>
          </div>
        ) : (
          [...qaHistory].reverse().slice(0, 8).map((qa, i) => (
            <div key={`eval-${i}`} className="bg-[#111B27] border border-[#1E2D3D] rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-700 text-[#2ABFBF] uppercase">{qa.category}</span>
                {qa.score !== undefined && (
                  <span className={`text-[11px] font-700 ${qa.score >= 7 ? 'text-emerald-400' : qa.score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                    {qa.score}/10
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#7A9BAA] line-clamp-2 mb-1">{qa.question}</p>
              {qa.feedback && (
                <p className="text-[10px] text-[#4A6B7A] italic line-clamp-2">{qa.feedback}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
