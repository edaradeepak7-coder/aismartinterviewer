'use client';
import React from 'react';
import { RefreshCw, Sparkles, ChevronRight } from 'lucide-react';

interface AIQuestionSuggestorProps {
  suggestions: string[];
  isGenerating: boolean;
  currentCategory: string;
  categories: string[];
  onSelectQuestion: (q: string, category?: string) => void;
  onRefresh: () => void;
  onCategoryChange: (c: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Technical: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  HR: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Managerial: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Behavioral: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Situational: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'Role-Specific': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

export default function AIQuestionSuggestor({
  suggestions, isGenerating, currentCategory, categories,
  onSelectQuestion, onRefresh, onCategoryChange,
}: AIQuestionSuggestorProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1E2D3D] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#2ABFBF]/20 flex items-center justify-center">
              <Sparkles size={13} className="text-[#2ABFBF]" />
            </div>
            <span className="text-[13px] font-700 text-[#7EC8C8]">AI Suggestions</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isGenerating}
            className="p-1.5 rounded-md hover:bg-[#1E2D3D] text-[#4A6B7A] hover:text-[#7EC8C8] transition-colors disabled:opacity-40"
            title="Refresh suggestions"
          >
            <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-[10px] text-[#3A5060]">Visible only to recruiter · Updates after each answer</p>
      </div>

      {/* Category filter */}
      <div className="px-3 py-2 border-b border-[#1E2D3D] shrink-0">
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`text-[9px] font-600 px-2 py-0.5 rounded-full border transition-all ${
                currentCategory === cat
                  ? CATEGORY_COLORS[cat] || 'bg-[#2ABFBF]/20 text-[#2ABFBF] border-[#2ABFBF]/30'
                  : 'bg-transparent text-[#3A5060] border-[#1E2D3D] hover:border-[#2A3D4D]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isGenerating ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`skel-${i}`} className="bg-[#111B27] border border-[#1E2D3D] rounded-lg p-3 animate-pulse">
                <div className="h-2 bg-[#1E2D3D] rounded w-3/4 mb-2" />
                <div className="h-2 bg-[#1E2D3D] rounded w-full mb-1" />
                <div className="h-2 bg-[#1E2D3D] rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Sparkles size={24} className="text-[#2ABFBF]/30 mb-2" />
            <p className="text-[12px] text-[#3A5060]">AI suggestions will appear here</p>
          </div>
        ) : (
          suggestions.map((q, i) => (
            <button
              key={`sug-${i}`}
              onClick={() => onSelectQuestion(q, currentCategory)}
              className="w-full text-left bg-[#111B27] hover:bg-[#162030] border border-[#1E2D3D] hover:border-[#2ABFBF]/30 rounded-lg p-3 transition-all group"
            >
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-700 text-[#2ABFBF]/60 mt-0.5 shrink-0">Q{i + 1}</span>
                <p className="text-[12px] text-[#A8C5C5] leading-relaxed group-hover:text-white transition-colors flex-1">
                  {q}
                </p>
                <ChevronRight size={13} className="text-[#2ABFBF]/0 group-hover:text-[#2ABFBF]/60 transition-all shrink-0 mt-0.5" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-[#1E2D3D] shrink-0">
        <p className="text-[9px] text-[#2A3D4D] text-center">
          🔒 AI suggestions are private to recruiter only
        </p>
      </div>
    </div>
  );
}
