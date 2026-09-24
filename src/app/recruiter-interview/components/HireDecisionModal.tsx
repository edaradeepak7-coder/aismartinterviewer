'use client';
import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Brain, Star } from 'lucide-react';
import type { EvaluationScore, QAPair } from './RecruiterInterviewScreen';

interface HireDecisionModalProps {
  candidateName: string;
  jobTitle: string;
  evaluationScores: EvaluationScore;
  qaHistory: QAPair[];
  elapsed: string;
  onDecide: (decision: 'hire' | 'no-hire' | 'maybe') => void;
  onClose: () => void;
}

export default function HireDecisionModal({
  candidateName, jobTitle, evaluationScores, qaHistory, elapsed, onDecide, onClose,
}: HireDecisionModalProps) {
  const [selected, setSelected] = useState<'hire' | 'no-hire' | 'maybe' | null>(null);

  // AI recommendation based on scores
  const aiRecommendation = evaluationScores.overall >= 7 ? 'hire' : evaluationScores.overall >= 5 ? 'maybe' : evaluationScores.overall > 0 ? 'no-hire' : null;

  const avgScore = evaluationScores.overall;
  const answeredCount = qaHistory.length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0E1520] border border-[#1E2D3D] rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#F5A623]/20 border border-[#F5A623]/30 flex items-center justify-center mx-auto mb-3">
            <Brain size={24} className="text-[#F5A623]" />
          </div>
          <h2 className="text-lg font-700 text-white">Interview Complete</h2>
          <p className="text-[13px] text-[#4A6B7A] mt-1">
            {candidateName} · {jobTitle}
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#111B27] border border-[#1E2D3D] rounded-xl p-3 text-center">
            <p className="text-[20px] font-800 text-[#2ABFBF]">{answeredCount}</p>
            <p className="text-[10px] text-[#4A6B7A]">Questions</p>
          </div>
          <div className="bg-[#111B27] border border-[#1E2D3D] rounded-xl p-3 text-center">
            <p className={`text-[20px] font-800 ${avgScore >= 7 ? 'text-emerald-400' : avgScore >= 5 ? 'text-amber-400' : avgScore > 0 ? 'text-red-400' : 'text-[#3A5060]'}`}>
              {avgScore > 0 ? `${avgScore}/10` : '—'}
            </p>
            <p className="text-[10px] text-[#4A6B7A]">Avg Score</p>
          </div>
          <div className="bg-[#111B27] border border-[#1E2D3D] rounded-xl p-3 text-center">
            <p className="text-[20px] font-800 text-white">{elapsed}</p>
            <p className="text-[10px] text-[#4A6B7A]">Duration</p>
          </div>
        </div>

        {/* AI Recommendation */}
        {aiRecommendation && (
          <div className={`flex items-center gap-3 rounded-xl p-3 mb-5 border ${
            aiRecommendation === 'hire' ? 'bg-emerald-500/10 border-emerald-500/30' :
            aiRecommendation === 'maybe'? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'
          }`}>
            <Star size={16} className={aiRecommendation === 'hire' ? 'text-emerald-400' : aiRecommendation === 'maybe' ? 'text-amber-400' : 'text-red-400'} />
            <div>
              <p className="text-[12px] font-700 text-white">AI Recommendation</p>
              <p className={`text-[11px] font-600 ${aiRecommendation === 'hire' ? 'text-emerald-400' : aiRecommendation === 'maybe' ? 'text-amber-400' : 'text-red-400'}`}>
                {aiRecommendation === 'hire' ? '✓ Strong candidate — recommend hiring' :
                 aiRecommendation === 'maybe'? '⚡ Borderline — consider second round' : '✗ Below threshold — not recommended'}
              </p>
            </div>
          </div>
        )}

        {/* Decision buttons */}
        <p className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-3">Your Decision</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <button
            onClick={() => setSelected('hire')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              selected === 'hire' ?'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' :'bg-[#111B27] border-[#1E2D3D] text-[#4A6B7A] hover:border-emerald-500/30 hover:text-emerald-400'
            }`}
          >
            <CheckCircle size={22} />
            <span className="text-[12px] font-700">Hire</span>
          </button>
          <button
            onClick={() => setSelected('maybe')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              selected === 'maybe' ?'bg-amber-500/20 border-amber-500/60 text-amber-400' :'bg-[#111B27] border-[#1E2D3D] text-[#4A6B7A] hover:border-amber-500/30 hover:text-amber-400'
            }`}
          >
            <AlertCircle size={22} />
            <span className="text-[12px] font-700">Maybe</span>
          </button>
          <button
            onClick={() => setSelected('no-hire')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              selected === 'no-hire' ?'bg-red-500/20 border-red-500/60 text-red-400' :'bg-[#111B27] border-[#1E2D3D] text-[#4A6B7A] hover:border-red-500/30 hover:text-red-400'
            }`}
          >
            <XCircle size={22} />
            <span className="text-[12px] font-700">No Hire</span>
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#111B27] border border-[#1E2D3D] text-[#4A6B7A] text-[13px] font-600 hover:bg-[#1E2D3D] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onDecide(selected)}
            disabled={!selected}
            className="flex-1 py-2.5 rounded-xl bg-[#2ABFBF] hover:bg-[#25AAAA] text-[#0C1017] text-[13px] font-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate Report →
          </button>
        </div>
      </div>
    </div>
  );
}
