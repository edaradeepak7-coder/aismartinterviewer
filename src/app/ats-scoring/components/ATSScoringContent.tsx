'use client';
import React, { useState, useRef } from 'react';
import { FileSearch, Upload, Zap, CheckCircle2, XCircle, AlertTriangle, Loader2, Target, FileText, RefreshCw, BarChart2, Sparkles, ArrowUpRight } from 'lucide-react';
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
}

const MOCK_RESULT: ATSResult = {
  score: 74,
  grade: 'Good',
  keywordMatch: 68,
  formatScore: 85,
  readabilityScore: 78,
  matchedKeywords: ['React', 'TypeScript', 'Node.js', 'REST API', 'Agile', 'Git', 'PostgreSQL', 'Docker'],
  missingKeywords: ['Kubernetes', 'CI/CD', 'AWS Lambda', 'Microservices', 'GraphQL', 'Redis'],
  suggestions: [
    { type: 'success', text: 'Strong technical skills section with relevant keywords' },
    { type: 'success', text: 'Clear work experience with quantified achievements' },
    { type: 'warning', text: 'Add more cloud/DevOps keywords (Kubernetes, CI/CD, AWS)' },
    { type: 'warning', text: 'Professional summary could be more role-specific' },
    { type: 'error', text: 'Missing measurable impact in 2 experience bullet points' },
    { type: 'error', text: 'Education section lacks relevant coursework or projects' },
  ],
  sections: [
    { name: 'Contact Information', score: 100, feedback: 'All required fields present' },
    { name: 'Professional Summary', score: 65, feedback: 'Too generic — tailor to the job description' },
    { name: 'Work Experience', score: 80, feedback: 'Good structure, add more metrics' },
    { name: 'Skills', score: 72, feedback: 'Missing several keywords from job description' },
    { name: 'Education', score: 60, feedback: 'Add relevant projects or coursework' },
  ],
};

const gradeColors: Record<string, { bg: string; text: string; ring: string }> = {
  Excellent: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  Good: { bg: 'bg-teal-50', text: 'text-teal-700', ring: 'ring-teal-400' },
  Fair: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-400' },
  Poor: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-400' },
};

export default function ATSScoringContent() {
  const { balance, canAfford } = useCreditBalance();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [jobDesc, setJobDesc] = useState('');
  const [fileName, setFileName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = () => {
    if (!canAfford('resumeAnalysis')) { setShowCreditModal(true); return; }
    setAnalyzing(true);
    setTimeout(() => {
      setResult(MOCK_RESULT);
      setAnalyzing(false);
    }, 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  };

  const scoreColor = (s: number) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-500';
  const scoreBarColor = (s: number) => s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-6">
      {showCreditModal && (
        <CreditCheckModal
          operation="resumeAnalysis"
          balance={balance}
          onConfirm={() => { setShowCreditModal(false); handleAnalyze(); }}
          onCancel={() => setShowCreditModal(false)}
        />
      )}

      {/* Header */}
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
          <p className="text-sm text-[#6B7A99]">Check how well your resume passes Applicant Tracking Systems for a specific job.</p>
        </div>
      </div>

      {!result ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload resume */}
          <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
            <h2 className="font-700 text-[#0D1B3E] text-sm mb-4 flex items-center gap-2">
              <FileText size={15} className="text-[#0D9488]" /> Upload Your Resume
            </h2>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#DDE3EE] rounded-xl p-8 text-center cursor-pointer hover:border-[#0D9488] hover:bg-[#0D9488]/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F4F6FA] group-hover:bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-3 transition-colors">
                <Upload size={20} className="text-[#6B7A99] group-hover:text-[#0D9488] transition-colors" />
              </div>
              {fileName ? (
                <div>
                  <p className="text-sm font-600 text-[#0D9488]">{fileName}</p>
                  <p className="text-xs text-[#6B7A99] mt-1">Click to change file</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-600 text-[#0D1B3E]">Drop your resume here</p>
                  <p className="text-xs text-[#6B7A99] mt-1">PDF, DOCX, or TXT · Max 5MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileChange} />
            {!fileName && (
              <div className="mt-3 bg-[#F4F6FA] rounded-lg p-3">
                <p className="text-xs font-600 text-[#3D5A80] mb-1">Or paste resume text:</p>
                <textarea rows={4} placeholder="Paste your resume content here..."
                  className="w-full text-xs text-[#0D1B3E] bg-transparent resize-none focus:outline-none" />
              </div>
            )}
          </div>

          {/* Job description */}
          <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
            <h2 className="font-700 text-[#0D1B3E] text-sm mb-4 flex items-center gap-2">
              <Target size={15} className="text-[#0D9488]" /> Target Job Description
            </h2>
            <textarea
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
              rows={10}
              placeholder="Paste the full job description here. The more detail you provide, the more accurate the ATS analysis will be.

Example:
We are looking for a Senior Frontend Engineer with 4+ years of experience in React, TypeScript, and modern web technologies. The ideal candidate will have experience with REST APIs, Agile methodologies, and cloud platforms like AWS..."
              className="w-full px-3 py-2.5 border border-[#DDE3EE] rounded-lg text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/20 resize-none transition-colors"
            />
            <p className="text-[11px] text-[#9BA8C0] mt-1.5">{jobDesc.length} characters</p>
          </div>

          {/* Analyze button */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
              <div className="flex-1">
                <p className="text-sm font-600 text-teal-800">Ready to analyze your resume?</p>
                <p className="text-xs text-teal-600 mt-0.5">This will cost <strong>1 credit</strong>. You have <strong>{balance.remaining.toLocaleString()}</strong> credits.</p>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || (!fileName && !jobDesc)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {analyzing ? 'Analyzing…' : 'Analyze Resume (1 cr)'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Score overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Main score */}
            <div className={`sm:col-span-1 ${gradeColors[result.grade].bg} border border-[#DDE3EE] rounded-xl p-5 flex flex-col items-center justify-center`}>
              <div className={`relative w-24 h-24 ring-4 ${gradeColors[result.grade].ring} rounded-full flex items-center justify-center mb-2`}>
                <span className={`text-3xl font-800 ${gradeColors[result.grade].text}`}>{result.score}</span>
              </div>
              <p className={`text-sm font-700 ${gradeColors[result.grade].text}`}>{result.grade}</p>
              <p className="text-xs text-[#6B7A99] mt-0.5">ATS Score</p>
            </div>

            {/* Sub scores */}
            {[
              { label: 'Keyword Match', value: result.keywordMatch, icon: <Target size={14} /> },
              { label: 'Format Score', value: result.formatScore, icon: <FileText size={14} /> },
              { label: 'Readability', value: result.readabilityScore, icon: <BarChart2 size={14} /> },
            ].map(item => (
              <div key={item.label} className="bg-white border border-[#DDE3EE] rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[#6B7A99] mb-3">
                  {item.icon}
                  <span className="text-xs font-500">{item.label}</span>
                </div>
                <div>
                  <p className={`text-2xl font-800 ${scoreColor(item.value)} mb-2`}>{item.value}%</p>
                  <div className="h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                    <div className={`h-full ${scoreBarColor(item.value)} rounded-full`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Keywords */}
            <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
              <h3 className="font-700 text-[#0D1B3E] text-sm mb-4">Keyword Analysis</h3>
              <div className="mb-4">
                <p className="text-xs font-600 text-emerald-700 mb-2 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Matched ({result.matchedKeywords.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.matchedKeywords.map(kw => (
                    <span key={kw} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-500 px-2 py-0.5 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-600 text-red-600 mb-2 flex items-center gap-1">
                  <XCircle size={12} /> Missing ({result.missingKeywords.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingKeywords.map(kw => (
                    <span key={kw} className="bg-red-50 text-red-600 border border-red-200 text-xs font-500 px-2 py-0.5 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
              <h3 className="font-700 text-[#0D1B3E] text-sm mb-4">Improvement Suggestions</h3>
              <div className="space-y-2.5">
                {result.suggestions.map((s, i) => (
                  <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${s.type === 'success' ? 'bg-emerald-50' : s.type === 'warning' ? 'bg-amber-50' : 'bg-red-50'}`}>
                    {s.type === 'success' ? <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                      : s.type === 'warning' ? <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                      : <XCircle size={13} className="text-red-500 mt-0.5 shrink-0" />}
                    <p className={`text-xs leading-relaxed ${s.type === 'success' ? 'text-emerald-700' : s.type === 'warning' ? 'text-amber-700' : 'text-red-600'}`}>{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section breakdown */}
            <div className="lg:col-span-2 bg-white border border-[#DDE3EE] rounded-xl p-5">
              <h3 className="font-700 text-[#0D1B3E] text-sm mb-4">Section Breakdown</h3>
              <div className="space-y-3">
                {result.sections.map(sec => (
                  <div key={sec.name} className="flex items-center gap-4">
                    <div className="w-36 shrink-0">
                      <p className="text-xs font-600 text-[#3D5A80]">{sec.name}</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                        <div className={`h-full ${scoreBarColor(sec.score)} rounded-full transition-all`} style={{ width: `${sec.score}%` }} />
                      </div>
                    </div>
                    <div className="w-10 text-right">
                      <span className={`text-xs font-700 ${scoreColor(sec.score)}`}>{sec.score}%</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#6B7A99] truncate">{sec.feedback}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setResult(null)} className="flex items-center gap-1.5 px-4 py-2 border border-[#DDE3EE] rounded-lg text-sm font-600 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors">
              <RefreshCw size={13} /> Analyze Another
            </button>
            <a href="/resume-builder" className="flex items-center gap-1.5 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276] transition-colors">
              <ArrowUpRight size={13} /> Improve Resume
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
