'use client';
import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle, XCircle, AlertCircle, Briefcase, TrendingUp } from 'lucide-react';
import { chatCompletionGroq } from '@/lib/ai/groqClient';
import type { EvaluationScore, QAPair, InterviewConfig } from './RecruiterInterviewScreen';

interface InterviewReportModalProps {
  config: InterviewConfig;
  qaHistory: QAPair[];
  evaluationScores: EvaluationScore;
  hireDecision: 'hire' | 'no-hire' | 'maybe';
  elapsed: string;
  recruiterNotes: string;
  onClose: () => void;
  onPostJob: () => void;
}

function extractMessageText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;
  const choices = d.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const msg = (choices[0] as Record<string, unknown>).message;
    if (msg && typeof msg === 'object') {
      const content = (msg as Record<string, unknown>).content;
      if (typeof content === 'string') return content.trim();
    }
  }
  if (typeof d.content === 'string') return d.content.trim();
  return '';
}

export default function InterviewReportModal({
  config, qaHistory, evaluationScores, hireDecision, elapsed, recruiterNotes, onClose, onPostJob,
}: InterviewReportModalProps) {
  const [reportSummary, setReportSummary] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'qa' | 'scores'>('summary');

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setIsGenerating(true);
    setAiUnavailable(false);
    try {
      const qaContext = qaHistory.slice(0, 10).map((qa, i) =>
        `Q${i + 1} [${qa.category}]: ${qa.question}\nAnswer: ${qa.answer}\nScore: ${qa.score ?? 'N/A'}/10`
      ).join('\n\n');

      const data = await chatCompletionGroq(
        [{
          role: 'user',
          content: `Generate a professional interview report for ${config.candidateName} applying for ${config.jobTitle} at ${config.company}.

Interview Q&A:
${qaContext}

Overall Score: ${evaluationScores.overall}/10
Decision: ${hireDecision.toUpperCase()}

Return JSON only (no markdown): {
  "summary": "2-3 sentence professional summary grounded only in the Q&A and scores",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["area1", "area2", "area3"]
}`,
        }],
        'llama-3.3-70b-versatile',
        { temperature: 0.6, max_tokens: 500 }
      );

      const content = extractMessageText(data);
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('AI response missing JSON');
      }
      const parsed = JSON.parse(match[0]) as {
        summary?: string;
        strengths?: string[];
        improvements?: string[];
      };
      setReportSummary(typeof parsed.summary === 'string' ? parsed.summary : '');
      setStrengths(Array.isArray(parsed.strengths) ? parsed.strengths.filter((s) => typeof s === 'string') : []);
      setImprovements(Array.isArray(parsed.improvements) ? parsed.improvements.filter((s) => typeof s === 'string') : []);
    } catch {
      // Honest empty — scores/Q&A tabs still show real interview data
      setReportSummary('');
      setStrengths([]);
      setImprovements([]);
      setAiUnavailable(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const lines = [
      `INTERVIEW REPORT`,
      `================`,
      `Candidate: ${config.candidateName}`,
      `Role: ${config.jobTitle}`,
      `Company: ${config.company}`,
      `Department: ${config.department}`,
      `Duration: ${elapsed}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Decision: ${hireDecision.toUpperCase()}`,
      ``,
      `SCORES`,
      `------`,
      `Overall: ${evaluationScores.overall}/10`,
      `Communication: ${evaluationScores.communication}/10`,
      `Technical: ${evaluationScores.technical}/10`,
      `Problem Solving: ${evaluationScores.problemSolving}/10`,
      `Cultural Fit: ${evaluationScores.cultural}/10`,
      ``,
      `SUMMARY`,
      `-------`,
      reportSummary || '(AI summary unavailable)',
      ``,
      `STRENGTHS`,
      `---------`,
      ...(strengths.length ? strengths.map(s => `• ${s}`) : ['(none generated)']),
      ``,
      `AREAS FOR IMPROVEMENT`,
      `---------------------`,
      ...(improvements.length ? improvements.map(i => `• ${i}`) : ['(none generated)']),
      ``,
      `Q&A TRANSCRIPT`,
      `--------------`,
      ...qaHistory.map((qa, i) => [
        `Q${i + 1} [${qa.category}]: ${qa.question}`,
        `Answer: ${qa.answer}`,
        `Score: ${qa.score ?? 'N/A'}/10`,
        qa.feedback ? `Feedback: ${qa.feedback}` : '',
        '',
      ].filter(Boolean).join('\n')),
      recruiterNotes ? `\nRECRUITER NOTES\n---------------\n${recruiterNotes}` : '',
    ].filter(l => l !== undefined).join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${config.candidateName.replace(/\s+/g, '-')}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const decisionConfig = {
    hire: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'HIRE' },
    'no-hire': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'NO HIRE' },
    maybe: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: 'SECOND ROUND' },
  }[hireDecision];

  const DecisionIcon = decisionConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0E1520] border border-[#1E2D3D] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D3D] shrink-0">
          <div className="flex items-center gap-3">
            <TrendingUp size={18} className="text-[#2ABFBF]" />
            <div>
              <h2 className="text-[15px] font-700 text-white">Interview Report</h2>
              <p className="text-[11px] text-[#4A6B7A]">{config.candidateName} · {config.jobTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2ABFBF]/10 border border-[#2ABFBF]/30 text-[#2ABFBF] text-[12px] font-600 hover:bg-[#2ABFBF]/20 transition-colors"
            >
              <Download size={13} />
              Download
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1E2D3D] text-[#4A6B7A] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Decision banner */}
        <div className={`mx-6 mt-4 flex items-center gap-3 rounded-xl p-3 border ${decisionConfig.bg} shrink-0`}>
          <DecisionIcon size={20} className={decisionConfig.color} />
          <div>
            <p className={`text-[14px] font-800 ${decisionConfig.color}`}>{decisionConfig.label}</p>
            <p className="text-[11px] text-[#4A6B7A]">Overall Score: {evaluationScores.overall}/10 · {qaHistory.length} questions · {elapsed}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {(['summary', 'qa', 'scores'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-600 transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-[#2ABFBF]/20 text-[#2ABFBF] border border-[#2ABFBF]/30'
                  : 'text-[#4A6B7A] hover:text-[#7EC8C8]'
              }`}
            >
              {tab === 'qa' ? 'Q&A Log' : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isGenerating ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`r-skel-${i}`} className="h-4 bg-[#1E2D3D] rounded animate-pulse" style={{ width: `${70 + i * 7}%` }} />
              ))}
            </div>
          ) : activeTab === 'summary' ? (
            <>
              <div className="bg-[#111B27] border border-[#1E2D3D] rounded-xl p-4">
                <p className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2">AI Summary</p>
                {aiUnavailable || !reportSummary ? (
                  <p className="text-[13px] text-[#4A6B7A] leading-relaxed">
                    AI summary unavailable. Scores and Q&amp;A below reflect this interview session.
                  </p>
                ) : (
                  <p className="text-[13px] text-[#A8C5C5] leading-relaxed">{reportSummary}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#111B27] border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-[11px] font-700 text-emerald-400 uppercase tracking-wider mb-2">✓ Strengths</p>
                  {strengths.length === 0 ? (
                    <p className="text-[12px] text-[#4A6B7A]">No AI strengths generated.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {strengths.map((s, i) => (
                        <li key={`str-${i}`} className="text-[12px] text-[#A8C5C5] flex items-start gap-1.5">
                          <span className="text-emerald-400 mt-0.5 shrink-0">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="bg-[#111B27] border border-amber-500/20 rounded-xl p-4">
                  <p className="text-[11px] font-700 text-amber-400 uppercase tracking-wider mb-2">↑ Improvements</p>
                  {improvements.length === 0 ? (
                    <p className="text-[12px] text-[#4A6B7A]">No AI improvements generated.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {improvements.map((imp, i) => (
                        <li key={`imp-${i}`} className="text-[12px] text-[#A8C5C5] flex items-start gap-1.5">
                          <span className="text-amber-400 mt-0.5 shrink-0">•</span>{imp}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {recruiterNotes && (
                <div className="bg-[#111B27] border border-[#1E2D3D] rounded-xl p-4">
                  <p className="text-[11px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-2">📝 Recruiter Notes</p>
                  <p className="text-[12px] text-[#7A9BAA] leading-relaxed">{recruiterNotes}</p>
                </div>
              )}
            </>
          ) : activeTab === 'scores' ? (
            <div className="space-y-3">
              {[
                { label: 'Overall', value: evaluationScores.overall },
                { label: 'Communication', value: evaluationScores.communication },
                { label: 'Technical', value: evaluationScores.technical },
                { label: 'Problem Solving', value: evaluationScores.problemSolving },
                { label: 'Cultural Fit', value: evaluationScores.cultural },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#111B27] border border-[#1E2D3D] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-600 text-[#A8C5C5]">{label}</span>
                    <span className={`text-[16px] font-800 ${value >= 7 ? 'text-emerald-400' : value >= 5 ? 'text-amber-400' : value > 0 ? 'text-red-400' : 'text-[#3A5060]'}`}>
                      {value > 0 ? `${value}/10` : '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-[#1E2D3D] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${value >= 7 ? 'bg-emerald-500' : value >= 5 ? 'bg-amber-500' : value > 0 ? 'bg-red-500' : 'bg-[#1E2D3D]'}`}
                      style={{ width: `${(value / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {qaHistory.map((qa, i) => (
                <div key={`qa-log-${i}`} className="bg-[#111B27] border border-[#1E2D3D] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-700 text-[#2ABFBF] bg-[#2ABFBF]/10 px-2 py-0.5 rounded-full">Q{i + 1}</span>
                      <span className="text-[10px] font-600 text-[#4A6B7A]">{qa.category}</span>
                    </div>
                    {qa.score !== undefined && (
                      <span className={`text-[12px] font-700 ${qa.score >= 7 ? 'text-emerald-400' : qa.score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                        {qa.score}/10
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] font-600 text-white mb-1.5">{qa.question}</p>
                  <p className="text-[12px] text-[#7A9BAA] leading-relaxed mb-1.5">{qa.answer}</p>
                  {qa.feedback && (
                    <p className="text-[11px] text-[#4A6B7A] italic border-t border-[#1E2D3D] pt-1.5">{qa.feedback}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1E2D3D] flex gap-3 shrink-0">
          <button
            onClick={onPostJob}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2ABFBF]/10 border border-[#2ABFBF]/30 text-[#2ABFBF] text-[13px] font-600 hover:bg-[#2ABFBF]/20 transition-colors"
          >
            <Briefcase size={15} />
            Post Job Opening
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#111B27] border border-[#1E2D3D] text-[#7A9BAA] text-[13px] font-600 hover:bg-[#1E2D3D] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
