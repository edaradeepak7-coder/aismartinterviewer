'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Mic, MicOff, Video, VideoOff, Radio, PhoneOff, Copy, Check, Clock, Wifi, Radio as RecordIcon } from 'lucide-react';
import WebRTCVideoGrid from './WebRTCVideoGrid';
import QuestionQueue, { type Question } from './QuestionQueue';
import CompetencyScoringPanel from './CompetencyScoringPanel';
import PostInterviewReport from './PostInterviewReport';
import type { RoomConfig } from './RoomSetup';
import { trackInterviewEvent } from '@/lib/analytics';
import ProctoringEngine, { type ProctoringEvent, type ProctoringInsights, computeInsights } from '@/components/ProctoringEngine';

export interface QAPair {
  question: string;
  answer: string;
  category: string;
  score?: number;
  feedback?: string;
  timestamp: string;
}

export interface EvaluationScore {
  communication: number;
  problemSolving: number;
  cultural: number;
  leadership: number;
  overall: number;
}

export interface InterviewConfig extends RoomConfig {
  roomId: string;
}

const INITIAL_SCORES: EvaluationScore = { communication: 0, problemSolving: 0, cultural: 0, leadership: 0, overall: 0 };

export default function LiveInterviewRoom({ config }: { config: InterviewConfig }) {
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [candidateConnected] = useState(false); // WebRTC signaling placeholder

  // Question queue state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Question['category']>('HR');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentQuestionObj, setCurrentQuestionObj] = useState<Question | null>(null);
  const [candidateAnswer, setCandidateAnswer] = useState('');

  // Evaluation state
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [scores, setScores] = useState<EvaluationScore>(INITIAL_SCORES);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);

  // Notes
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Modals
  const [showHireModal, setShowHireModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [hireDecision, setHireDecision] = useState<'hire' | 'no-hire' | 'maybe' | null>(null);
  const [isEnded, setIsEnded] = useState(false);

  // Room link copy
  const [linkCopied, setLinkCopied] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const roomLink = typeof window !== 'undefined'
    ? `${window.location.origin}/recruiter-interview/join/${config.roomId}`
    : `/recruiter-interview/join/${config.roomId}`;

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Initial AI suggestions on mount
  useEffect(() => {
    generateAISuggestions();
  }, []);

  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [proctoringInsights, setProctoringInsights] = useState<ProctoringInsights>({
    events: [], tabSwitchCount: 0, fullscreenExitCount: 0, faceNotDetectedSeconds: 0,
    audioAnomalies: 0, overallRiskScore: 0, riskLevel: 'clean', summary: 'No suspicious activity detected.',
  });

  const handleProctoringEvent = useCallback((event: ProctoringEvent) => {
    setProctoringEvents(prev => [...prev, event]);
    setProctoringInsights(computeInsights([...proctoringEvents, event]));
  }, [proctoringEvents]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const totalSeconds = config.duration * 60;
  const remaining = totalSeconds - elapsedSeconds;
  const isWarning = remaining < 600;
  const remainingMin = Math.max(0, Math.floor(remaining / 60));

  const generateAISuggestions = useCallback(async (lastAnswer?: string, lastQuestion?: string) => {
    setIsGenerating(true);
    try {
      const historyContext = qaHistory.slice(-3).map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n');
      const prompt = lastAnswer
        ? `You are an expert recruiter interviewing for ${config.jobTitle} (${config.department}).
Previous context:
${historyContext}

Last question: "${lastQuestion}"
Candidate's answer: "${lastAnswer}"

Based on this answer, suggest 5 follow-up questions. Focus on ${currentCategory} type questions. Probe deeper into gaps or expand on strong points. Each question under 100 words.
Return JSON: {"questions": ["q1","q2","q3","q4","q5"]}`
        : `You are an expert recruiter interviewing for ${config.jobTitle} at ${config.company} (${config.department}).
Question mix preference: Technical ${config.questionMix.Technical}%, HR ${config.questionMix.HR}%, Managerial ${config.questionMix.Managerial}%, Behavioral ${config.questionMix.Behavioral}%.

Generate 5 opening ${currentCategory} interview questions. Each under 100 words.
Return JSON: {"questions": ["q1","q2","q3","q4","q5"]}`;

      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'OPEN_AI',
          model: 'gpt-4.1-mini',
          messages: [{ role: 'user', content: prompt }],
          parameters: { max_completion_tokens: 600 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setAiSuggestions(parsed.questions || []);
        }
      }
    } catch (err) {
      console.error('AI suggestion error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [qaHistory, config.jobTitle, config.company, config.department, config.questionMix, currentCategory]);

  const evaluateAnswer = useCallback(async (question: string, answer: string, category: string) => {
    if (!answer.trim() || !question.trim()) return null;
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, role: config.jobTitle, category }),
      });
      if (res.ok) {
        const data = await res.json();
        return { score: data.score || 5, feedback: data.feedback || '' };
      }
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
    return null;
  }, [config.jobTitle]);

  const handleSelectQuestion = useCallback((q: Question) => {
    setCurrentQuestion(q.text);
    setCurrentQuestionObj(q);
    setCurrentCategory(q.category);
    toast.success('Question selected — ask the candidate');
  }, []);

  const handleAddCustomQuestion = useCallback((text: string, category: Question['category']) => {
    const newQ: Question = { id: `custom-${Date.now()}`, text, category, asked: false };
    setQuestions(prev => [...prev, newQ]);
    toast.success('Question added to queue');
  }, []);

  const handleRemoveQuestion = useCallback((id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  const handleSubmitQA = useCallback(async () => {
    if (!currentQuestion.trim() || !candidateAnswer.trim()) {
      toast.error('Enter both question and candidate answer');
      return;
    }

    const evaluation = await evaluateAnswer(currentQuestion, candidateAnswer, currentCategory);

    const newPair: QAPair = {
      question: currentQuestion,
      answer: candidateAnswer,
      category: currentCategory,
      score: evaluation?.score,
      feedback: evaluation?.feedback,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    };

    setQaHistory(prev => [...prev, newPair]);

    // Update scores
    if (evaluation?.score) {
      setScores(prev => {
        const count = qaHistory.length + 1;
        const isTech = currentCategory === 'Technical';
        const isHR = currentCategory === 'HR' || currentCategory === 'Behavioral';
        const isMgr = currentCategory === 'Managerial';
        const s = evaluation.score;
        return {
          communication: Math.round(((prev.communication * (count - 1)) + (isHR ? s : s * 0.75)) / count),
          problemSolving: Math.round(((prev.problemSolving * (count - 1)) + (isTech ? s : s * 0.8)) / count),
          cultural: Math.round(((prev.cultural * (count - 1)) + (isHR ? s : s * 0.65)) / count),
          leadership: Math.round(((prev.leadership * (count - 1)) + (isMgr ? s : s * 0.7)) / count),
          overall: Math.round(((prev.overall * (count - 1)) + s) / count),
        };
      });
    }

    // Mark question as asked in queue
    if (currentQuestionObj) {
      setQuestions(prev => prev.map(q => q.id === currentQuestionObj.id ? { ...q, asked: true } : q));
    }

    // Generate next AI suggestions
    await generateAISuggestions(candidateAnswer, currentQuestion);

    setCurrentQuestion('');
    setCandidateAnswer('');
    setCurrentQuestionObj(null);
    setQuestionNumber(n => n + 1);
    toast.success(`Q${questionNumber} recorded & evaluated`);
    trackInterviewEvent('question_evaluated', { category: currentCategory, score: evaluation?.score });
  }, [currentQuestion, candidateAnswer, currentCategory, currentQuestionObj, evaluateAnswer, generateAISuggestions, qaHistory.length, questionNumber]);

  const handleEndInterview = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsEnded(true);
    setShowHireModal(true);
    trackInterviewEvent('interview_ended', { questions_asked: questionNumber - 1, duration: elapsedSeconds });
  }, [questionNumber, elapsedSeconds]);

  const handleHireDecision = useCallback((decision: 'hire' | 'no-hire' | 'maybe') => {
    setHireDecision(decision);
    setShowHireModal(false);
    setShowReport(true);
    trackInterviewEvent('hire_decision_made', { decision });
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setLinkCopied(true);
      toast.success('Room link copied!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const totalQuestions = 20; // configurable

  return (
    <div className="min-h-screen bg-[#0F1923] flex flex-col text-white overflow-hidden" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <header className="h-14 bg-[#141F2B] border-b border-[#1E2D3D] flex items-center px-4 lg:px-5 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00C9B1] to-[#00A896] flex items-center justify-center">
            <span className="text-[11px] font-800 text-[#0F1923]">T</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-[12px] font-700 text-white leading-tight">{config.company}</p>
            <p className="text-[10px] text-[#4A6B7A] leading-tight">{config.jobTitle}</p>
          </div>
        </div>

        {/* Candidate chip */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#00C9B1]/10 border border-[#00C9B1]/20 rounded-lg">
          <div className="w-5 h-5 rounded-full bg-[#00C9B1]/20 flex items-center justify-center">
            <span className="text-[9px] font-800 text-[#00C9B1]">{config.candidateName[0]?.toUpperCase() || 'C'}</span>
          </div>
          <span className="text-[11px] font-600 text-[#7EC8C8]">{config.candidateName}</span>
        </div>

        {/* Q counter */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#F0B429]/10 border border-[#F0B429]/20 rounded-lg">
          <span className="text-[12px] font-700 text-[#F0B429]">Q{questionNumber}</span>
        </div>

        {/* Room link */}
        <button
          onClick={handleCopyLink}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1E2D3D] border border-[#2A3D4D] rounded-lg text-[11px] text-[#4A6B7A] hover:text-[#7EC8C8] hover:border-[#3A5060] transition-all"
        >
          {linkCopied ? <Check size={11} className="text-[#00C9B1]" /> : <Copy size={11} />}
          <span className="font-600">{config.roomId}</span>
        </button>

        <div className="flex-1" />

        {/* Recording */}
        {isRecording && (
          <div className="flex items-center gap-1 text-[11px] text-red-400 font-600">
            <Radio size={12} className="animate-pulse" />
            <span className="hidden sm:inline">REC</span>
          </div>
        )}

        {/* Connection */}
        <div className="flex items-center gap-1 text-[11px] text-emerald-400">
          <Wifi size={13} />
          <span className="hidden sm:inline text-[10px]">Live</span>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-600 tabular-nums ${
          isWarning ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[#0F1923] border-[#1E2D3D] text-white'
        }`}>
          <Clock size={12} />
          <span>{formatTime(elapsedSeconds)}</span>
          <span className="text-[#3A5060] font-400 text-[10px]">/ {remainingMin}m</span>
        </div>

        {/* End */}
        <button
          onClick={handleEndInterview}
          disabled={isEnded}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[12px] font-600 hover:bg-red-500/20 transition-colors active:scale-95 disabled:opacity-40"
        >
          <PhoneOff size={13} />
          <span className="hidden sm:inline">End</span>
        </button>
      </header>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Question Queue */}
        <div className="w-72 xl:w-80 bg-[#141F2B] border-r border-[#1E2D3D] flex flex-col overflow-hidden shrink-0">
          <QuestionQueue
            questions={questions}
            aiSuggestions={aiSuggestions}
            isGenerating={isGenerating}
            currentCategory={currentCategory}
            onSelectQuestion={handleSelectQuestion}
            onAddCustomQuestion={handleAddCustomQuestion}
            onRefreshSuggestions={() => generateAISuggestions()}
            onCategoryChange={setCurrentCategory}
            onRemoveQuestion={handleRemoveQuestion}
          />

          {/* Notes */}
          <div className="border-t border-[#1E2D3D] p-3 shrink-0">
            <button
              onClick={() => setShowNotes(v => !v)}
              className="w-full flex items-center justify-between text-[11px] font-600 text-[#7EC8C8] mb-2"
            >
              <span>📝 Private Notes</span>
              <span className="text-[#4A6B7A]">{showNotes ? '▲' : '▼'}</span>
            </button>
            {showNotes && (
              <textarea
                value={recruiterNotes}
                onChange={e => setRecruiterNotes(e.target.value)}
                placeholder="Private notes — not visible to candidate..."
                rows={3}
                className="w-full bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2 text-[12px] text-[#A8C5C5] placeholder:text-[#3A5060] resize-none focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/40"
              />
            )}
          </div>
        </div>

        {/* CENTER: Video + Q&A input */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <WebRTCVideoGrid
            config={config}
            isMicMuted={isMicMuted}
            isCameraOff={isCameraOff}
            candidateConnected={candidateConnected}
            currentQuestion={currentQuestion}
            lastAnswer={qaHistory[qaHistory.length - 1]?.answer || ''}
          />

          {/* Q&A Input */}
          <div className="bg-[#141F2B] border-t border-[#1E2D3D] p-4 space-y-3 shrink-0">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-700 text-[#00C9B1] uppercase tracking-wider mb-1 block">
                  Current Question (Q{questionNumber})
                </label>
                <textarea
                  value={currentQuestion}
                  onChange={e => setCurrentQuestion(e.target.value)}
                  placeholder="Select from AI suggestions or type your question..."
                  rows={2}
                  className="w-full bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-[#3A5060] resize-none focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/40 transition-colors"
                />
              </div>
              <div className="flex flex-col justify-end">
                <select
                  value={currentCategory}
                  onChange={e => setCurrentCategory(e.target.value as Question['category'])}
                  className="bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-2 py-2 text-[11px] text-[#A8C5C5] focus:outline-none focus:ring-1 focus:ring-[#00C9B1]/40"
                >
                  {(['Technical', 'HR', 'Managerial', 'Behavioral'] as const).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-700 text-[#F0B429] uppercase tracking-wider mb-1 block">
                Candidate's Answer
              </label>
              <div className="flex gap-2">
                <textarea
                  value={candidateAnswer}
                  onChange={e => setCandidateAnswer(e.target.value)}
                  placeholder="Type or transcribe candidate's answer for AI evaluation..."
                  rows={2}
                  className="flex-1 bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-[#3A5060] resize-none focus:outline-none focus:ring-1 focus:ring-[#F0B429]/40 transition-colors"
                />
                <button
                  onClick={handleSubmitQA}
                  disabled={!currentQuestion.trim() || !candidateAnswer.trim() || isEvaluating}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00C9B1] to-[#00A896] text-[#0F1923] text-[13px] font-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 self-end hover:shadow-lg hover:shadow-[#00C9B1]/20"
                >
                  {isEvaluating ? '...' : 'Evaluate →'}
                </button>
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div className="bg-[#141F2B] border-t border-[#1E2D3D] px-4 py-3 flex items-center justify-center gap-3 shrink-0">
            <button
              onClick={() => setIsMicMuted(v => !v)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
                isMicMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-[#1E2D3D] border-[#2A3D4D] text-[#7EC8C8] hover:bg-[#2A3D4D]'
              }`}
              title={isMicMuted ? 'Unmute' : 'Mute'}
            >
              {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              onClick={() => setIsCameraOff(v => !v)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
                isCameraOff ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-[#1E2D3D] border-[#2A3D4D] text-[#7EC8C8] hover:bg-[#2A3D4D]'
              }`}
              title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
            </button>

            <button
              onClick={() => setIsRecording(v => !v)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
                isRecording ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-[#1E2D3D] border-[#2A3D4D] text-[#4A6B7A] hover:bg-[#2A3D4D]'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <RecordIcon size={18} className={isRecording ? 'animate-pulse' : ''} />
            </button>

            <button
              onClick={handleEndInterview}
              disabled={isEnded}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-[13px] font-700 transition-all active:scale-95 disabled:opacity-40"
            >
              <PhoneOff size={15} />
              End Interview
            </button>
          </div>
        </div>

        {/* RIGHT: Competency Scoring */}
        <div className="w-72 xl:w-80 bg-[#141F2B] border-l border-[#1E2D3D] flex flex-col overflow-hidden shrink-0">
          <CompetencyScoringPanel
            qaHistory={qaHistory}
            scores={scores}
            isEvaluating={isEvaluating}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
          />
        </div>
      </div>

      {/* Hire Decision Modal */}
      {showHireModal && (
        <HireDecisionModal
          candidateName={config.candidateName}
          jobTitle={config.jobTitle}
          scores={scores}
          qaCount={qaHistory.length}
          elapsed={formatTime(elapsedSeconds)}
          onDecide={handleHireDecision}
          onClose={() => setShowHireModal(false)}
        />
      )}

      {/* Post-Interview Report */}
      {showReport && hireDecision && (
        <PostInterviewReport
          config={config}
          qaHistory={qaHistory}
          scores={scores}
          hireDecision={hireDecision}
          elapsed={formatTime(elapsedSeconds)}
          recruiterNotes={recruiterNotes}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

// Inline Hire Decision Modal
function HireDecisionModal({
  candidateName, jobTitle, scores, qaCount, elapsed, onDecide, onClose,
}: {
  candidateName: string; jobTitle: string; scores: EvaluationScore;
  qaCount: number; elapsed: string;
  onDecide: (d: 'hire' | 'no-hire' | 'maybe') => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<'hire' | 'no-hire' | 'maybe' | null>(null);
  const aiRec = scores.overall >= 7 ? 'hire' : scores.overall >= 5 ? 'maybe' : scores.overall > 0 ? 'no-hire' : null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141F2B] border border-[#1E2D3D] rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#F0B429]/15 border border-[#F0B429]/30 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🎯</span>
          </div>
          <h2 className="text-[17px] font-800 text-white">Interview Complete</h2>
          <p className="text-[12px] text-[#4A6B7A] mt-1">{candidateName} · {jobTitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Questions', value: qaCount, color: 'text-[#00C9B1]' },
            { label: 'Score', value: scores.overall > 0 ? `${scores.overall}/10` : '—', color: scores.overall >= 7 ? 'text-emerald-400' : scores.overall >= 5 ? 'text-[#F0B429]' : 'text-red-400' },
            { label: 'Duration', value: elapsed, color: 'text-white' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0F1923] border border-[#1E2D3D] rounded-xl p-3 text-center">
              <p className={`text-[18px] font-800 ${color}`}>{value}</p>
              <p className="text-[10px] text-[#4A6B7A]">{label}</p>
            </div>
          ))}
        </div>

        {aiRec && (
          <div className={`flex items-center gap-2 rounded-xl p-3 mb-4 border ${
            aiRec === 'hire' ? 'bg-emerald-500/10 border-emerald-500/30' :
            aiRec === 'maybe' ? 'bg-[#F0B429]/10 border-[#F0B429]/30' : 'bg-red-500/10 border-red-500/30'
          }`}>
            <span className="text-base">🤖</span>
            <div>
              <p className="text-[11px] font-700 text-white">AI Recommendation</p>
              <p className={`text-[11px] font-600 ${aiRec === 'hire' ? 'text-emerald-400' : aiRec === 'maybe' ? 'text-[#F0B429]' : 'text-red-400'}`}>
                {aiRec === 'hire' ? '✓ Strong candidate — recommend hiring' :
                 aiRec === 'maybe' ? '⚡ Borderline — consider second round' : '✗ Below threshold — not recommended'}
              </p>
            </div>
          </div>
        )}

        <p className="text-[10px] font-700 text-[#4A6B7A] uppercase tracking-wider mb-3">Your Decision</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {([
            { key: 'hire', label: 'Hire', emoji: '✓', activeClass: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' },
            { key: 'maybe', label: 'Maybe', emoji: '⚡', activeClass: 'bg-[#F0B429]/20 border-[#F0B429]/60 text-[#F0B429]' },
            { key: 'no-hire', label: 'No Hire', emoji: '✗', activeClass: 'bg-red-500/20 border-red-500/60 text-red-400' },
          ] as const).map(({ key, label, emoji, activeClass }) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                selected === key ? activeClass : 'bg-[#0F1923] border-[#1E2D3D] text-[#4A6B7A] hover:border-[#2A3D4D]'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              <span className="text-[11px] font-700">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#0F1923] border border-[#1E2D3D] text-[#4A6B7A] text-[13px] font-600 hover:bg-[#1E2D3D] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onDecide(selected)}
            disabled={!selected}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00C9B1] to-[#00A896] text-[#0F1923] text-[13px] font-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate Report →
          </button>
        </div>
      </div>
    </div>
  );
}
