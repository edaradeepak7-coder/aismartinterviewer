'use client';
import React, { useState, useEffect } from 'react';
import { X, Download, CheckCircle, XCircle, AlertCircle, TrendingUp, MessageSquare, Lightbulb } from 'lucide-react';
import type { QAPair, EvaluationScore, InterviewConfig } from './LiveInterviewRoom';
import ProctoringReportSection from '@/components/ProctoringReportSection';
import type { ProctoringInsights } from '@/components/ProctoringEngine';

interface PostInterviewReportProps {
  config: InterviewConfig;
  qaHistory: QAPair[];
  scores: EvaluationScore;
  hireDecision: 'hire' | 'no-hire' | 'maybe';
  elapsed: string;
  recruiterNotes: string;
  onClose: () => void;
  proctoringInsights?: ProctoringInsights;
}

interface ReportData {
  summary: string;
  strengths: string[];
  improvements: string[];
  answerFeedback: { questionIndex: number; feedback: string; improvementTip: string }[];
  recommendation: string;
}

export default function PostInterviewReport({
  config, qaHistory, scores, hireDecision, elapsed, recruiterNotes, onClose, proctoringInsights,
}: PostInterviewReportProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'answers' | 'scores' | 'proctoring'>('summary');

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const qaContext = qaHistory.slice(0, 12).map((qa, i) =>
        `Q${i + 1} [${qa.category}]: ${qa.question}\nAnswer: ${qa.answer}\nScore: ${qa.score ?? 'N/A'}/10`
      ).join('\n\n');

      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'OPEN_AI',
          model: 'gpt-4.1-mini',
          messages: [{
            role: 'user',
            content: `Generate a professional interview report for ${config.candidateName} applying for ${config.jobTitle}.

Q&A:
${qaContext}

Scores: Communication ${scores.communication}/10, Problem Solving ${scores.problemSolving}/10, Cultural Fit ${scores.cultural}/10, Leadership ${scores.leadership}/10, Overall ${scores.overall}/10
Decision: ${hireDecision.toUpperCase()}

Return JSON:
{
  "summary": "2-3 sentence professional summary",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["area1", "area2"],
  "answerFeedback": [
    {"questionIndex": 0, "feedback": "what was good/bad about this answer", "improvementTip": "specific tip to improve next time"}
  ],
  "recommendation": "1-2 sentence hiring recommendation"
}`,
          }],
          parameters: { max_completion_tokens: 1200 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setReport(parsed);
          return;
        }
      }
    } catch (err) {
      console.error('Report generation error:', err);
    }

    // Fallback
    setReport({
      summary: `${config.candidateName} completed the interview for ${config.jobTitle}. Overall performance scored ${scores.overall}/10 across ${qaHistory.length} questions.`,
      strengths: ['Completed all questions', 'Engaged throughout interview', 'Clear communication'],
      improvements: ['Provide more specific examples', 'Expand on technical depth'],
      answerFeedback: qaHistory.slice(0, 5).map((qa, i) => ({
        questionIndex: i,
        feedback: `Score: ${qa.score ?? 'N/A'}/10 — ${qa.score && qa.score >= 7 ? 'Strong answer with good detail.' : 'Answer could be more specific.'}`,
        improvementTip: 'Use the STAR method (Situation, Task, Action, Result) for structured responses.',
      })),
      recommendation: hireDecision === 'hire' ? 'Recommend proceeding to offer stage.' : hireDecision === 'maybe' ? 'Consider a second round interview.' : 'Does not meet the required threshold for this role.',
    });
    setIsGenerating(false);
  };

  useEffect(() => {
    if (report) setIsGenerating(false);
  }, [report]);

  const handleDownload = () => {
    if (!report) return;
    const proctoringSection = proctoringInsights ? [
      ``,
      `PROCTORING REPORT`,
      `-----------------`,
      `Risk Level: ${proctoringInsights.riskLevel.toUpperCase()}`,
      `Integrity Score: ${Math.max(0, 100 - proctoringInsights.overallRiskScore)}/100`,
      `Tab Switches: ${proctoringInsights.tabSwitchCount}`,
      `Fullscreen Exits: ${proctoringInsights.fullscreenExitCount}`,
      `Face Absent: ~${proctoringInsights.faceNotDetectedSeconds}s`,
      `Audio Anomalies: ${proctoringInsights.audioAnomalies}`,
      `Summary: ${proctoringInsights.summary}`,
    ] : [];
    const lines = [
      `INTERVIEW REPORT — ${config.company}`,
      `${'='.repeat(50)}`,
      `Candidate: ${config.candidateName}`,
      `Role: ${config.jobTitle} | Department: ${config.department}`,
      `Duration: ${elapsed} | Date: ${new Date().toLocaleDateString()}`,
      `Decision: ${hireDecision.toUpperCase()}`,
      ``,
      `SCORES`,
      `------`,
      `Overall: ${scores.overall}/10`,
      `Communication: ${scores.communication}/10`,
      `Problem Solving: ${scores.problemSolving}/10`,
      `Cultural Fit: ${scores.cultural}/10`,
      `Leadership: ${scores.leadership}/10`,
      ``,
      `SUMMARY`,
      `-------`,
      report.summary,
      ``,
      `RECOMMENDATION`,
      `--------------`,
      report.recommendation,
      ``,
      `STRENGTHS`,
      `---------`,
      ...report.strengths.map(s => `• ${s}`),
      ``,
      `AREAS FOR IMPROVEMENT`,
      `---------------------`,
      ...report.improvements.map(i => `• ${i}`),
      ``,
      `Q&A TRANSCRIPT WITH FEEDBACK`,
      `-----------------------------`,
      ...qaHistory.map((qa, i) => {
        const fb = report.answerFeedback?.find(f => f.questionIndex === i);
        return [
          `Q${i + 1} [${qa.category}]: ${qa.question}`,
          `Answer: ${qa.answer}`,
          `Score: ${qa.score ?? 'N/A'}/10`,
          fb ? `Feedback: ${fb.feedback}` : '',
          fb ? `Improvement Tip: ${fb.improvementTip}` : '',
          '',
        ].filter(Boolean).join('\n');
      }),
      recruiterNotes ? `\nRECRUITER NOTES\n---------------\n${recruiterNotes}` : '',
    ].filter(l => l !== undefined).join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-${config.candidateName.replace(/\s+/g, '-')}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const decisionMap = {
    hire: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'HIRE' },
    'no-hire': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'NO HIRE' },
    maybe: { icon: AlertCircle, color: 'text-[#F0B429]', bg: 'bg-[#F0B429]/10 border-[#F0B429]/30', label: 'SECOND ROUND' },
  }[hireDecision];

  const DecisionIcon = decisionMap.icon;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141F2B] border border-[#1E2D3D] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D3D] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00C9B1]/15 flex items-center justify-center">
              <TrendingUp size={16} className="text-[#00C9B1]" />
            </div>
            <div>
              <h2 className="text-[15px] font-700 text-white">Post-Interview Report</h2>
              <p className="text-[11px] text-[#4A6B7A]">{config.candidateName} · {config.jobTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isGenerating || !report}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00C9B1]/10 border border-[#00C9B1]/30 text-[#00C9B1] text-[12px] font-600 hover:bg-[#00C9B1]/20 transition-colors disabled:opacity-40"
            >
              <Download size={13} />
              Download
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[#1E2D3D] text-[#4A6B7A] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Decision banner */}
        <div className={`mx-6 mt-4 flex items-center gap-3 rounded-xl p-3 border ${decisionMap.bg} shrink-0`}>
          <DecisionIcon size={20} className={decisionMap.color} />
          <div>
            <p className={`text-[14px] font-800 ${decisionMap.color}`}>{decisionMap.label}</p>
            <p className="text-[11px] text-[#4A6B7A]">Score: {scores.overall}/10 · {qaHistory.length} questions · {elapsed}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {(['summary', 'answers', 'scores', 'proctoring'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-600 transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-[#00C9B1]/15 text-[#00C9B1] border border-[#00C9B1]/30'
                  : 'text-[#4A6B7A] hover:text-[#7EC8C8]'
              }`}
            >
              {tab === 'answers' ? 'Answer Feedback' : tab === 'proctoring' ? '🛡 Proctoring' : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isGenerating ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 bg-[#1E2D3D] rounded-lg animate-pulse" style={{ width: `${65 + i * 8}%` }} />
              ))}
            </div>
          ) : !report ? null : activeTab === 'proctoring' ? (
            proctoringInsights ? (
              <ProctoringReportSection insights={proctoringInsights} />
            ) : (
              <div className="text-center py-8 text-[#4A6B7A] text-sm">No proctoring data available for this session.</div>
            )
          ) : activeTab === 'summary' ? (
            <>
              <div className="bg-[#0F1923] border border-[#1E2D3D] rounded-xl p-4">
                <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2">AI Summary</p>
                <p className="text-[13px] text-[#A8C5C5] leading-relaxed">{report.summary}</p>
              </div>

              <div className="bg-[#0F1923] border border-[#00C9B1]/20 rounded-xl p-4">
                <p className="text-[10px] font-700 text-[#00C9B1] uppercase tracking-wider mb-2">Recommendation</p>
                <p className="text-[13px] text-white leading-relaxed">{report.recommendation}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0F1923] border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-[10px] font-700 text-emerald-400 uppercase tracking-wider mb-2">✓ Strengths</p>
                  <ul className="space-y-1.5">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="text-[12px] text-[#A8C5C5] flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5 shrink-0">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#0F1923] border border-[#F0B429]/20 rounded-xl p-4">
                  <p className="text-[10px] font-700 text-[#F0B429] uppercase tracking-wider mb-2">↑ Improvements</p>
                  <ul className="space-y-1.5">
                    {report.improvements.map((imp, i) => (
                      <li key={i} className="text-[12px] text-[#A8C5C5] flex items-start gap-1.5">
                        <span className="text-[#F0B429] mt-0.5 shrink-0">•</span>{imp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {recruiterNotes && (
                <div className="bg-[#0F1923] border border-[#1E2D3D] rounded-xl p-4">
                  <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2">📝 Recruiter Notes</p>
                  <p className="text-[12px] text-[#7A9BAA] leading-relaxed">{recruiterNotes}</p>
                </div>
              )}
            </>
          ) : activeTab === 'answers' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-[#F0B429]/5 border border-[#F0B429]/20 rounded-xl p-3">
                <Lightbulb size={14} className="text-[#F0B429] shrink-0" />
                <p className="text-[11px] text-[#C8A87E]">Per-answer feedback helps candidates improve in future interviews</p>
              </div>
              {qaHistory.map((qa, i) => {
                const fb = report.answerFeedback?.find(f => f.questionIndex === i);
                return (
                  <div key={i} className="bg-[#0F1923] border border-[#1E2D3D] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-700 text-[#4A6B7A]">Q{i + 1}</span>
                        <span className="text-[9px] font-700 text-[#00C9B1] bg-[#00C9B1]/10 px-1.5 py-0.5 rounded-full">{qa.category}</span>
                      </div>
                      {qa.score !== undefined && (
                        <span className={`text-[13px] font-800 ${qa.score >= 7 ? 'text-emerald-400' : qa.score >= 5 ? 'text-[#F0B429]' : 'text-red-400'}`}>
                          {qa.score}/10
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-white mb-2 font-500">{qa.question}</p>
                    <p className="text-[11px] text-[#7A9BAA] mb-3 italic line-clamp-3">"{qa.answer}"</p>
                    {fb && (
                      <>
                        <div className="flex items-start gap-2 mb-2">
                          <MessageSquare size={11} className="text-[#4A6B7A] shrink-0 mt-0.5" />
                          <p className="text-[11px] text-[#A8C5C5]">{fb.feedback}</p>
                        </div>
                        <div className="flex items-start gap-2 bg-[#F0B429]/5 border border-[#F0B429]/15 rounded-lg p-2">
                          <Lightbulb size={11} className="text-[#F0B429] shrink-0 mt-0.5" />
                          <p className="text-[11px] text-[#C8A87E]"><span className="font-600">Tip:</span> {fb.improvementTip}</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Overall', value: scores.overall, color: 'from-[#00C9B1] to-[#00A896]' },
                { label: 'Communication', value: scores.communication, color: 'from-blue-500 to-blue-400' },
                { label: 'Problem Solving', value: scores.problemSolving, color: 'from-[#F0B429] to-[#D4A017]' },
                { label: 'Cultural Fit', value: scores.cultural, color: 'from-emerald-500 to-emerald-400' },
                { label: 'Leadership', value: scores.leadership, color: 'from-purple-500 to-purple-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0F1923] border border-[#1E2D3D] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-600 text-white">{label}</span>
                    <span className={`text-[16px] font-800 ${value >= 7 ? 'text-emerald-400' : value >= 5 ? 'text-[#F0B429]' : value > 0 ? 'text-red-400' : 'text-[#3A5060]'}`}>
                      {value > 0 ? `${value}/10` : '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-[#1E2D3D] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                      style={{ width: `${(value / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
