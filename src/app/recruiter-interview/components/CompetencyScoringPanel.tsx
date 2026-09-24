'use client';
import React from 'react';
import { Brain, MessageCircle, TrendingUp, Users, Star, Zap } from 'lucide-react';
import type { QAPair, EvaluationScore } from './LiveInterviewRoom';
import Icon from '@/components/ui/AppIcon';


interface CompetencyScoringPanelProps {
  qaHistory: QAPair[];
  scores: EvaluationScore;
  isEvaluating: boolean;
  questionNumber: number;
  totalQuestions: number;
}

function ScoreBar({ label, score, icon: Icon, color, bgColor }: {
  label: string; score: number; icon: React.ElementType; color: string; bgColor: string;
}) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  const scoreColor = score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-[#F0B429]' : score > 0 ? 'text-red-400' : 'text-[#3A5060]';
  const barColor = score >= 7 ? 'from-emerald-500 to-emerald-400' : score >= 5 ? 'from-[#F0B429] to-[#D4A017]' : score > 0 ? 'from-red-500 to-red-400' : 'from-[#1E2D3D] to-[#1E2D3D]';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-md ${bgColor} flex items-center justify-center`}>
            <Icon size={10} className={color} />
          </div>
          <span className="text-[11px] text-[#7A9BAA]">{label}</span>
        </div>
        <span className={`text-[13px] font-800 tabular-nums ${scoreColor}`}>
          {score > 0 ? `${score}/10` : '—'}
        </span>
      </div>
      <div className="h-1.5 bg-[#1E2D3D] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CompetencyScoringPanel({
  qaHistory, scores, isEvaluating, questionNumber, totalQuestions,
}: CompetencyScoringPanelProps) {
  const progress = totalQuestions > 0 ? Math.round((qaHistory.length / totalQuestions) * 100) : 0;

  const overallColor = scores.overall >= 7 ? 'text-emerald-400' : scores.overall >= 5 ? 'text-[#F0B429]' : scores.overall > 0 ? 'text-red-400' : 'text-[#3A5060]';
  const overallRing = scores.overall >= 7 ? 'border-emerald-500/40' : scores.overall >= 5 ? 'border-[#F0B429]/40' : scores.overall > 0 ? 'border-red-500/40' : 'border-[#1E2D3D]';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1E2D3D] shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#F0B429]/15 flex items-center justify-center">
              <Brain size={13} className="text-[#F0B429]" />
            </div>
            <span className="text-[13px] font-700 text-[#C8A87E]">Live Scoring</span>
          </div>
          {isEvaluating && (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1 h-1 rounded-full bg-[#F0B429] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
              <span className="text-[9px] text-[#F0B429]">Evaluating</span>
            </div>
          )}
        </div>
      </div>

      {/* Overall score ring */}
      <div className="px-4 py-4 border-b border-[#1E2D3D] shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full border-2 ${overallRing} flex flex-col items-center justify-center bg-[#141F2B] shrink-0`}>
            <span className={`text-[18px] font-800 tabular-nums ${overallColor}`}>
              {scores.overall > 0 ? scores.overall : '—'}
            </span>
            {scores.overall > 0 && <span className="text-[8px] text-[#4A6B7A]">/10</span>}
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-700 text-white mb-0.5">Overall Score</p>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="flex-1 h-1.5 bg-[#1E2D3D] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    scores.overall >= 7 ? 'bg-emerald-500' : scores.overall >= 5 ? 'bg-[#F0B429]' : scores.overall > 0 ? 'bg-red-500' : 'bg-[#1E2D3D]'
                  }`}
                  style={{ width: `${(scores.overall / 10) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-[#4A6B7A]">
              {scores.overall >= 7 ? '✓ Strong candidate' : scores.overall >= 5 ? '⚡ Borderline' : scores.overall > 0 ? '✗ Below threshold' : 'Awaiting answers'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-[#1E2D3D] shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[#4A6B7A]">Interview Progress</span>
          <span className="text-[11px] font-700 text-[#00C9B1]">{qaHistory.length}/{totalQuestions}</span>
        </div>
        <div className="h-1.5 bg-[#1E2D3D] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00C9B1] to-[#00A896] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Competency scores */}
      <div className="px-4 py-3 border-b border-[#1E2D3D] space-y-3 shrink-0">
        <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider">Competency Breakdown</p>
        <ScoreBar label="Communication" score={scores.communication} icon={MessageCircle} color="text-blue-400" bgColor="bg-blue-500/10" />
        <ScoreBar label="Problem Solving" score={scores.problemSolving} icon={TrendingUp} color="text-[#F0B429]" bgColor="bg-[#F0B429]/10" />
        <ScoreBar label="Cultural Fit" score={scores.cultural} icon={Users} color="text-emerald-400" bgColor="bg-emerald-500/10" />
        <ScoreBar label="Leadership" score={scores.leadership} icon={Star} color="text-purple-400" bgColor="bg-purple-500/10" />
      </div>

      {/* Recent evaluations */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2">Answer Evaluations</p>
        {qaHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-center">
            <Zap size={18} className="text-[#1E2D3D] mb-2" />
            <p className="text-[11px] text-[#3A5060]">Evaluations appear after each answer</p>
          </div>
        ) : (
          [...qaHistory].reverse().slice(0, 6).map((qa, i) => (
            <div key={`eval-${i}`} className="bg-[#141F2B] border border-[#1E2D3D] rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-700 text-[#00C9B1] uppercase tracking-wider">{qa.category}</span>
                {qa.score !== undefined && (
                  <span className={`text-[12px] font-800 ${qa.score >= 7 ? 'text-emerald-400' : qa.score >= 5 ? 'text-[#F0B429]' : 'text-red-400'}`}>
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
