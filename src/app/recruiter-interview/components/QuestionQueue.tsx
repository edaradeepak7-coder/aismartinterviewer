'use client';
import React, { useState, useCallback } from 'react';
import { Sparkles, RefreshCw, ChevronRight, Lock, Plus, Trash2 } from 'lucide-react';
import { trackInterviewEvent } from '@/lib/analytics';

export interface Question {
  id: string;
  text: string;
  category: 'Technical' | 'HR' | 'Managerial' | 'Behavioral';
  asked: boolean;
  aiRecommended?: boolean;
}

interface QuestionQueueProps {
  questions: Question[];
  aiSuggestions: string[];
  isGenerating: boolean;
  currentCategory: 'Technical' | 'HR' | 'Managerial' | 'Behavioral';
  onSelectQuestion: (q: Question) => void;
  onAddCustomQuestion: (text: string, category: Question['category']) => void;
  onRefreshSuggestions: () => void;
  onCategoryChange: (c: Question['category']) => void;
  onRemoveQuestion: (id: string) => void;
}

const CAT_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Technical: { bg: 'bg-[#00C9B1]/10', text: 'text-[#00C9B1]', border: 'border-[#00C9B1]/30', dot: 'bg-[#00C9B1]' },
  HR: { bg: 'bg-[#F0B429]/10', text: 'text-[#F0B429]', border: 'border-[#F0B429]/30', dot: 'bg-[#F0B429]' },
  Managerial: { bg: 'bg-[#818CF8]/10', text: 'text-[#818CF8]', border: 'border-[#818CF8]/30', dot: 'bg-[#818CF8]' },
  Behavioral: { bg: 'bg-[#F87171]/10', text: 'text-[#F87171]', border: 'border-[#F87171]/30', dot: 'bg-[#F87171]' },
};

const CATEGORIES: Question['category'][] = ['Technical', 'HR', 'Managerial', 'Behavioral'];

export default function QuestionQueue({
  questions, aiSuggestions, isGenerating, currentCategory,
  onSelectQuestion, onAddCustomQuestion, onRefreshSuggestions, onCategoryChange, onRemoveQuestion,
}: QuestionQueueProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'ai'>('ai');
  const [customText, setCustomText] = useState('');
  const [customCat, setCustomCat] = useState<Question['category']>('HR');

  const handleAddCustom = () => {
    if (!customText.trim()) return;
    onAddCustomQuestion(customText.trim(), customCat);
    setCustomText('');
    trackInterviewEvent('custom_question_added', { category: customCat });
  };

  const pendingQuestions = questions.filter(q => !q.asked);
  const askedQuestions = questions.filter(q => q.asked);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1E2D3D] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#00C9B1]/15 flex items-center justify-center">
              <Sparkles size={13} className="text-[#00C9B1]" />
            </div>
            <span className="text-[13px] font-700 text-[#7EC8C8]">Question Queue</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock size={10} className="text-[#3A5060]" />
            <span className="text-[9px] text-[#3A5060]">Recruiter only</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {(['ai', 'queue'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-600 transition-colors ${
                activeTab === tab
                  ? 'bg-[#00C9B1]/15 text-[#00C9B1] border border-[#00C9B1]/30'
                  : 'text-[#4A6B7A] hover:text-[#7EC8C8]'
              }`}
            >
              {tab === 'ai' ? `AI Suggestions` : `Queue (${pendingQuestions.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="px-3 py-2 border-b border-[#1E2D3D] shrink-0">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(cat => {
            const s = CAT_STYLES[cat];
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`text-[9px] font-700 px-2 py-0.5 rounded-full border transition-all ${
                  currentCategory === cat ? `${s.bg} ${s.text} ${s.border}` : 'bg-transparent text-[#3A5060] border-[#1E2D3D] hover:border-[#2A3D4D]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'ai' ? (
          <div className="p-3 space-y-2">
            {/* Refresh */}
            <button
              onClick={onRefreshSuggestions}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[#1E2D3D] text-[11px] text-[#4A6B7A] hover:border-[#00C9B1]/30 hover:text-[#00C9B1] transition-all disabled:opacity-40"
            >
              <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? 'Generating...' : 'Refresh AI suggestions'}
            </button>

            {isGenerating ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[#141F2B] border border-[#1E2D3D] rounded-xl p-3 animate-pulse">
                  <div className="h-2 bg-[#1E2D3D] rounded w-3/4 mb-2" />
                  <div className="h-2 bg-[#1E2D3D] rounded w-full mb-1" />
                  <div className="h-2 bg-[#1E2D3D] rounded w-2/3" />
                </div>
              ))
            ) : aiSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-center">
                <Sparkles size={22} className="text-[#00C9B1]/20 mb-2" />
                <p className="text-[11px] text-[#3A5060]">AI will suggest questions based on candidate answers</p>
              </div>
            ) : (
              aiSuggestions.map((q, i) => {
                const s = CAT_STYLES[currentCategory];
                return (
                  <button
                    key={`ai-${i}`}
                    onClick={() => {
                      const qObj: Question = { id: `ai-${Date.now()}-${i}`, text: q, category: currentCategory, asked: false, aiRecommended: true };
                      onSelectQuestion(qObj);
                      trackInterviewEvent('ai_question_selected', { category: currentCategory });
                    }}
                    className="w-full text-left bg-[#141F2B] hover:bg-[#1A2535] border border-[#1E2D3D] hover:border-[#00C9B1]/30 rounded-xl p-3 transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                      <p className="text-[12px] text-[#A8C5C5] leading-relaxed group-hover:text-white transition-colors flex-1">{q}</p>
                      <ChevronRight size={12} className="text-[#00C9B1]/0 group-hover:text-[#00C9B1]/60 transition-all shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 ml-3.5">
                      <Sparkles size={9} className="text-[#00C9B1]/50" />
                      <span className="text-[9px] text-[#3A5060]">AI recommended</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {/* Add custom question */}
            <div className="bg-[#141F2B] border border-[#1E2D3D] rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider">Add Question</p>
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Type your question..."
                rows={2}
                className="w-full bg-[#0F1923] border border-[#1E2D3D] rounded-lg px-2.5 py-2 text-[12px] text-white placeholder:text-[#3A5060] resize-none focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/40"
              />
              <div className="flex gap-2">
                <select
                  value={customCat}
                  onChange={e => setCustomCat(e.target.value as Question['category'])}
                  className="flex-1 bg-[#0F1923] border border-[#1E2D3D] rounded-lg px-2 py-1.5 text-[11px] text-[#A8C5C5] focus:outline-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  onClick={handleAddCustom}
                  disabled={!customText.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00C9B1]/15 border border-[#00C9B1]/30 text-[#00C9B1] text-[11px] font-600 hover:bg-[#00C9B1]/25 transition-all disabled:opacity-40"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>
            </div>

            {/* Pending questions */}
            {pendingQuestions.length > 0 && (
              <>
                <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider px-1">Pending ({pendingQuestions.length})</p>
                {pendingQuestions.map(q => {
                  const s = CAT_STYLES[q.category];
                  return (
                    <div key={q.id} className="flex items-start gap-2 bg-[#141F2B] border border-[#1E2D3D] rounded-xl p-3 group">
                      <button
                        onClick={() => onSelectQuestion(q)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-700 px-1.5 py-0.5 rounded-full ${s.bg} ${s.text} ${s.border} border`}>{q.category}</span>
                          {q.aiRecommended && <Sparkles size={9} className="text-[#00C9B1]/50" />}
                        </div>
                        <p className="text-[11px] text-[#A8C5C5] leading-relaxed group-hover:text-white transition-colors">{q.text}</p>
                      </button>
                      <button
                        onClick={() => onRemoveQuestion(q.id)}
                        className="p-1 rounded-md hover:bg-red-500/10 text-[#3A5060] hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Asked questions */}
            {askedQuestions.length > 0 && (
              <>
                <p className="text-[10px] font-700 text-[#3A5060] uppercase tracking-wider px-1 mt-3">Asked ({askedQuestions.length})</p>
                {askedQuestions.map(q => (
                  <div key={q.id} className="flex items-start gap-2 bg-[#0F1923] border border-[#1E2D3D] rounded-xl p-3 opacity-50">
                    <div className="flex-1">
                      <p className="text-[11px] text-[#4A6B7A] line-through leading-relaxed">{q.text}</p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {pendingQuestions.length === 0 && askedQuestions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-24 text-center">
                <p className="text-[11px] text-[#3A5060]">No questions in queue yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
