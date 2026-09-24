'use client';
import React, { useState, useRef } from 'react';
import {
  FileSearch, Upload, Zap, CheckCircle2, XCircle, AlertTriangle, Loader2,
  FileText, RefreshCw, Sparkles,
} from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';
import { useCreditBalance } from '@/lib/hooks/useCreditBalance';
import CreditCheckModal from '@/components/CreditCheckModal';

interface ATSResult {
  score: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  keywordMatch: number;
  formatScore: number;
  readabilityScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: { type: 'success' | 'warning' | 'error'; text: string }[];
  sections: { name: string; score: number; feedback: string }[];
  source?: string;
}

const gradeColors: Record<string, { bg: string; text: string; ring: string }> = {
  Excellent: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  Good: { bg: 'bg-teal-50', text: 'text-teal-700', ring: 'ring-teal-400' },
  Fair: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-400' },
  Poor: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-400' },
};

export default function ATSScoringContent() {
  const { balance, canAfford } = useCreditBalance();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsText(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    try {
      const text = await readFileAsText(f);
      setResumeText(text);
    } catch {
      setError('Could not read that file. Paste resume text instead.');
    }
  };

  const runAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const creditRes = await fetch('/api/credits/consume', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action_type: 'analyze',
          feature: 'ats_scoring',
          credits: 1,
        }),
      });
      if (!creditRes.ok) {
        const creditJson = await creditRes.json().catch(() => ({}));
        setError(creditJson.error || 'Insufficient credits to run ATS scoring.');
        return;
      }

      const res = await fetch('/api/ats-scoring', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          resumeText,
          jobTitle,
          jobDescription: jobDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Analysis failed');
        return;
      }
      setResult({
        score: json.score,
        grade: json.grade,
        keywordMatch: json.keywordMatch,
        formatScore: json.formatScore,
        readabilityScore: json.readabilityScore,
        matchedKeywords: json.matchedKeywords || [],
        missingKeywords: json.missingKeywords || [],
        suggestions: json.suggestions || [],
        sections: json.sections || [],
        source: json.source,
      });
    } catch {
      setError('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = () => {
    if (!resumeText.trim() || resumeText.trim().length < 40) {
      setError('Paste or upload resume text (at least 40 characters).');
      return;
    }
    if (!canAfford('atsScoring') && !canAfford('resumeAnalysis')) {
      setShowCreditModal(true);
      return;
    }
    runAnalyze();
  };

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-500';
  const scoreBarColor = (s: number) =>
    s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-amber-500' : 'bg-red-500';

  const suggestionIcon = (type: string) => {
    if (type === 'success') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (type === 'warning') return <AlertTriangle size={14} className="text-amber-500" />;
    return <XCircle size={14} className="text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {showCreditModal && (
        <CreditCheckModal
          operation="atsScoring"
          balance={balance}
          onConfirm={() => {
            setShowCreditModal(false);
            runAnalyze();
          }}
          onCancel={() => setShowCreditModal(false)}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
              <FileSearch size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-700 text-[#0D1B3E]">ATS Resume Scorer</h1>
            <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-700 px-2 py-0.5 rounded-full">
              <Zap size={9} /> 1 Credit
            </span>
          </div>
          <p className="text-sm text-[#6B7A99]">
            Score your resume against a job description. Results are stored to your account.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {!result ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#DDE3EE] rounded-xl p-5 space-y-4">
            <h2 className="font-700 text-[#0D1B3E] text-sm flex items-center gap-2">
              <FileText size={15} className="text-[#0D9488]" /> Resume
            </h2>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#DDE3EE] rounded-xl p-6 text-center cursor-pointer hover:border-[#0D9488]"
            >
              <Upload size={20} className="text-[#6B7A99] mx-auto mb-2" />
              {fileName ? (
                <p className="text-sm font-600 text-[#0D9488]">{fileName}</p>
              ) : (
                <p className="text-xs text-[#6B7A99]">Upload a .txt resume or paste below</p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,text/plain"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={10}
              placeholder="Paste resume text here..."
              className="w-full border border-[#DDE3EE] rounded-xl p-3 text-sm outline-none focus:border-teal-500"
            />
          </div>

          <div className="bg-white border border-[#DDE3EE] rounded-xl p-5 space-y-4">
            <h2 className="font-700 text-[#0D1B3E] text-sm flex items-center gap-2">
              <Sparkles size={15} className="text-[#0D9488]" /> Target role
            </h2>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Job title (e.g. Frontend Engineer)"
              className="w-full border border-[#DDE3EE] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500"
            />
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              rows={10}
              placeholder="Paste job description..."
              className="w-full border border-[#DDE3EE] rounded-xl p-3 text-sm outline-none focus:border-teal-500"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-700 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {analyzing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileSearch size={16} />
              )}
              {analyzing ? 'Analyzing…' : 'Analyze resume'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-2xl ${gradeColors[result.grade]?.bg}`}>
              <span className={`text-4xl font-800 ${scoreColor(result.score)}`}>{result.score}</span>
              <div>
                <p className={`text-sm font-700 ${gradeColors[result.grade]?.text}`}>{result.grade}</p>
                <p className="text-[10px] text-[#6B7A99]">
                  {result.source === 'heuristic' ? 'Heuristic score' : 'ATS score'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-600 text-[#6B7A99] hover:text-teal-600"
            >
              <RefreshCw size={12} /> New scan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Keyword match', value: result.keywordMatch },
              { label: 'Structure', value: result.formatScore },
              { label: 'Readability', value: result.readabilityScore },
            ].map((m) => (
              <div key={m.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
                <p className="text-[10px] text-[#6B7A99] font-600 uppercase">{m.label}</p>
                <p className={`text-2xl font-800 mt-1 ${scoreColor(m.value)}`}>{m.value}</p>
                <div className="h-1.5 bg-[#F4F6FA] rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full ${scoreBarColor(m.value)}`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-3">Matched keywords</h3>
              <div className="flex flex-wrap gap-1.5">
                {result.matchedKeywords.length === 0 ? (
                  <p className="text-xs text-[#6B7A99]">None detected</p>
                ) : (
                  result.matchedKeywords.map((k) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded-full text-[10px] font-600 bg-teal-50 text-teal-700"
                    >
                      {k}
                    </span>
                  ))
                )}
              </div>
              <h3 className="text-sm font-700 text-[#0D1B3E] mt-4 mb-3">Missing keywords</h3>
              <div className="flex flex-wrap gap-1.5">
                {result.missingKeywords.length === 0 ? (
                  <p className="text-xs text-[#6B7A99]">None flagged</p>
                ) : (
                  result.missingKeywords.map((k) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded-full text-[10px] font-600 bg-amber-50 text-amber-700"
                    >
                      {k}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Suggestions</h3>
              {result.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#0D1B3E]">
                  {suggestionIcon(s.type)}
                  <span>{s.text}</span>
                </div>
              ))}
              <h3 className="text-sm font-700 text-[#0D1B3E] pt-2">Sections</h3>
              {result.sections.map((sec) => (
                <div key={sec.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-600">{sec.name}</span>
                    <span className={scoreColor(sec.score)}>{sec.score}</span>
                  </div>
                  <p className="text-[10px] text-[#6B7A99]">{sec.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
