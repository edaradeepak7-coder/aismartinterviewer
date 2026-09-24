'use client';
import React, { useMemo } from 'react';
import { CheckCircle2, Circle, AlertCircle, ChevronRight, Zap } from 'lucide-react';

interface TopicCoverage {
  topic: string;
  priority: 'high' | 'medium' | 'low';
  questionsAsked: number;
  maxQuestions: number;
  saturation: number; // 0-100
  covered: boolean;
}

interface InterviewCoverageTrackerProps {
  askedTopics: string[];
  totalQuestions: number;
  answeredCount: number;
  currentTopic?: string;
  resumeSkills?: string[];
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function buildTopicCoverage(
  resumeSkills: string[],
  askedTopics: string[],
  totalQuestions: number
): TopicCoverage[] {
  const skills = resumeSkills.length > 0 ? resumeSkills : ['React', 'TypeScript', 'JavaScript', 'System Design', 'Performance'];

  // Assign priorities based on position in skills list
  const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {};
  skills.forEach((s, i) => {
    if (i < Math.ceil(skills.length / 3)) priorityMap[s] = 'high';
    else if (i < Math.ceil((skills.length * 2) / 3)) priorityMap[s] = 'medium';
    else priorityMap[s] = 'low';
  });

  // Count how many times each topic was asked
  const topicCounts: Record<string, number> = {};
  askedTopics.forEach((t) => {
    topicCounts[t] = (topicCounts[t] || 0) + 1;
  });

  const maxPerTopic = Math.max(2, Math.floor(totalQuestions / skills.length));

  return skills.map((skill) => {
    const asked = topicCounts[skill] || 0;
    const saturation = Math.min(100, Math.round((asked / maxPerTopic) * 100));
    return {
      topic: skill,
      priority: priorityMap[skill] || 'low',
      questionsAsked: asked,
      maxQuestions: maxPerTopic,
      saturation,
      covered: asked >= 1,
    };
  });
}

export default function InterviewCoverageTracker({
  askedTopics,
  totalQuestions,
  answeredCount,
  currentTopic,
  resumeSkills = [],
}: InterviewCoverageTrackerProps) {
  const topics = useMemo(
    () => buildTopicCoverage(resumeSkills, askedTopics, totalQuestions),
    [resumeSkills, askedTopics, totalQuestions]
  );

  const coveredCount = topics.filter((t) => t.covered).length;
  const coveragePct = topics.length > 0 ? Math.round((coveredCount / topics.length) * 100) : 0;

  const nextUntested = useMemo(() => {
    return [...topics]
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
      .find((t) => !t.covered);
  }, [topics]);

  const sortedTopics = useMemo(
    () => [...topics].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [topics]
  );

  const priorityColor = {
    high: 'text-rose-400',
    medium: 'text-amber-400',
    low: 'text-slate-400',
  };

  const priorityBg = {
    high: 'bg-rose-500/20',
    medium: 'bg-amber-500/20',
    low: 'bg-slate-500/20',
  };

  const saturationColor = (sat: number) => {
    if (sat >= 80) return 'bg-teal-500';
    if (sat >= 40) return 'bg-amber-500';
    return 'bg-slate-600';
  };

  return (
    <div className="bg-[#0D1526] border border-white/10 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-teal-400" />
          <span className="text-[12px] font-700 text-white uppercase tracking-wider">Coverage Tracker</span>
        </div>
        <span className="text-[11px] text-slate-400">{answeredCount}/{totalQuestions} answered</span>
      </div>

      {/* Coverage ring */}
      <div className="px-4 py-3 flex items-center gap-4 border-b border-white/10">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="28" cy="28" r="22"
              fill="none"
              stroke={coveragePct >= 70 ? '#0D9488' : coveragePct >= 40 ? '#F59E0B' : '#64748B'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (1 - coveragePct / 100)}`}
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-700 text-white">
            {coveragePct}%
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-600 text-white leading-tight">
            {coveredCount}/{topics.length} topics covered
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
            {topics.length - coveredCount} remaining
          </p>
          {nextUntested && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <ChevronRight size={11} className="text-teal-400 shrink-0" />
              <span className="text-[11px] text-teal-300 truncate">
                Next: <span className="font-600">{nextUntested.topic}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Topic list */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-64">
        {sortedTopics.map((t) => {
          const isActive = currentTopic === t.topic;
          return (
            <div
              key={t.topic}
              className={[
                'px-4 py-2.5 flex items-center gap-3 transition-colors',
                isActive ? 'bg-teal-500/10' : '',
              ].join(' ')}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {t.covered ? (
                  <CheckCircle2 size={14} className="text-teal-400" />
                ) : t.priority === 'high' ? (
                  <AlertCircle size={14} className="text-rose-400" />
                ) : (
                  <Circle size={14} className="text-slate-600" />
                )}
              </div>

              {/* Topic info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={['text-[12px] font-600 truncate', t.covered ? 'text-white' : 'text-slate-400'].join(' ')}>
                    {t.topic}
                  </span>
                  <span className={['text-[9px] font-700 uppercase px-1.5 py-0.5 rounded-full', priorityBg[t.priority], priorityColor[t.priority]].join(' ')}>
                    {t.priority}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-700 uppercase px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 animate-pulse">
                      active
                    </span>
                  )}
                </div>
                {/* Saturation bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={['h-1 rounded-full transition-all duration-500', saturationColor(t.saturation)].join(' ')}
                      style={{ width: `${t.saturation}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                    {t.questionsAsked}/{t.maxQuestions}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      {nextUntested && (
        <div className="px-4 py-2.5 border-t border-white/10 bg-teal-500/5">
          <p className="text-[11px] text-teal-300 leading-tight">
            <span className="font-700">Auto-advance:</span> AI will shift to{' '}
            <span className="font-600">{nextUntested.topic}</span> when current topic saturates
          </p>
        </div>
      )}
    </div>
  );
}
