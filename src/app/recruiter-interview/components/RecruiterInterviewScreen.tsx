'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import RecruiterVideoGrid from './RecruiterVideoGrid';
import AIQuestionSuggestor from './AIQuestionSuggestor';
import LiveEvaluationPanel from './LiveEvaluationPanel';
import RecruiterControls from './RecruiterControls';
import RecruiterHeader from './RecruiterHeader';
import HireDecisionModal from './HireDecisionModal';
import InterviewReportModal from './InterviewReportModal';
import JobPostingModal from './JobPostingModal';
import { toast } from 'sonner';
import {
  trackB2BFlow,
  trackInterviewCompletion,
  trackFeature,
} from '@/lib/analytics/tracker';

export type RecruiterVoiceState = 'idle' | 'candidate_speaking' | 'recruiter_speaking' | 'processing' | 'completed';

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
  technical: number;
  problemSolving: number;
  cultural: number;
  overall: number;
}

export interface InterviewConfig {
  candidateName: string;
  candidateRole: string;
  jobTitle: string;
  department: string;
  company: string;
  duration: number; // minutes
  questionCount: number;
}

const DEFAULT_CONFIG: InterviewConfig = {
  candidateName: 'Candidate',
  candidateRole: 'Software Engineer',
  jobTitle: 'Senior Software Engineer',
  department: 'Engineering',
  company: 'Triveda',
  duration: 45,
  questionCount: 35,
};

const QUESTION_CATEGORIES = ['Technical', 'HR', 'Managerial', 'Behavioral', 'Situational', 'Role-Specific'];

export default function RecruiterInterviewScreen() {
  const [config] = useState<InterviewConfig>(DEFAULT_CONFIG);
  const [voiceState, setVoiceState] = useState<RecruiterVoiceState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentCategory, setCurrentCategory] = useState('Technical');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [evaluationScores, setEvaluationScores] = useState<EvaluationScore>({
    communication: 0, technical: 0, problemSolving: 0, cultural: 0, overall: 0,
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showJobPostingModal, setShowJobPostingModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hireDecision, setHireDecision] = useState<'hire' | 'no-hire' | 'maybe' | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [candidateAnswerBuffer, setCandidateAnswerBuffer] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [recruiterNotes, setRecruiterNotes] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const evaluationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Track live interview start once on mount
  useEffect(() => {
    trackB2BFlow('first_live_interview_started', {
      job_title: DEFAULT_CONFIG.jobTitle,
      duration_minutes: DEFAULT_CONFIG.duration,
    });
    trackFeature('live_evaluation_panel_viewed');
  }, []);

  // Auto-generate initial suggestions on mount
  useEffect(() => {
    generateInitialSuggestions();
  }, []);

  const generateInitialSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    try {
      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a professional interview coach. Generate 5 opening interview questions for a ${config.jobTitle} position at ${config.company}. Mix: 2 Technical, 1 HR, 1 Behavioral, 1 Situational. Each question must be under 120 words. Return as JSON array: {"questions": ["q1","q2","q3","q4","q5"]}`,
          }],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setSuggestedQuestions(parsed.questions || []);
        }
      }
    } catch (err) {
      console.error('Failed to generate initial suggestions:', err);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Generate next question suggestions based on candidate's answer
  const generateNextSuggestions = useCallback(async (answer: string, askedQuestion: string) => {
    if (!answer.trim()) return;
    setIsGeneratingSuggestions(true);
    try {
      const historyContext = qaHistory.slice(-3).map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n');
      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are an expert recruiter interviewing for ${config.jobTitle}. 
Previous Q&A context:
${historyContext}

Last question asked: "${askedQuestion}"
Candidate's answer: "${answer}"

Based on this answer, suggest 5 follow-up questions. Mix categories: Technical, HR, Behavioral, Managerial, Situational. Each question must be under 120 words and probe deeper into the candidate's response or explore gaps. Return as JSON: {"questions": ["q1","q2","q3","q4","q5"]}`,
          }],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setSuggestedQuestions(parsed.questions || []);
        }
      }
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [qaHistory, config.jobTitle]);

  // Evaluate candidate answer in real-time
  const evaluateAnswer = useCallback(async (question: string, answer: string) => {
    if (!answer.trim() || !question.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          answer,
          role: config.jobTitle,
          category: currentCategory,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const score = data.score || 5;
        const feedback = data.feedback || '';

        // Update running scores
        setEvaluationScores(prev => {
          const count = qaHistory.length + 1;
          const techQ = currentCategory === 'Technical';
          const hrQ = currentCategory === 'HR' || currentCategory === 'Behavioral';
          return {
            communication: Math.round(((prev.communication * (count - 1)) + (hrQ ? score : score * 0.8)) / count),
            technical: Math.round(((prev.technical * (count - 1)) + (techQ ? score : score * 0.6)) / count),
            problemSolving: Math.round(((prev.problemSolving * (count - 1)) + score * 0.9) / count),
            cultural: Math.round(((prev.cultural * (count - 1)) + (hrQ ? score : score * 0.7)) / count),
            overall: Math.round(((prev.overall * (count - 1)) + score) / count),
          };
        });

        return { score, feedback };
      }
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
    return null;
  }, [qaHistory.length, currentCategory, config.jobTitle]);

  const handleSelectQuestion = useCallback((question: string, category?: string) => {
    setCurrentQuestion(question);
    if (category) setCurrentCategory(category);
    trackFeature('ai_question_suggestor_used', { category: category ?? 'unknown' });
    toast.success('Question selected — ask the candidate');
  }, []);

  const handleSubmitQA = useCallback(async () => {
    if (!currentQuestion.trim() || !candidateAnswerBuffer.trim()) {
      toast.error('Please enter both question and candidate answer');
      return;
    }

    const evaluation = await evaluateAnswer(currentQuestion, candidateAnswerBuffer);

    const newPair: QAPair = {
      question: currentQuestion,
      answer: candidateAnswerBuffer,
      category: currentCategory,
      score: evaluation?.score,
      feedback: evaluation?.feedback,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    };

    setQaHistory(prev => [...prev, newPair]);
    await generateNextSuggestions(candidateAnswerBuffer, currentQuestion);

    setCurrentQuestion('');
    setCandidateAnswerBuffer('');
    setQuestionNumber(n => n + 1);
    toast.success(`Q${questionNumber} recorded`);
  }, [currentQuestion, candidateAnswerBuffer, currentCategory, evaluateAnswer, generateNextSuggestions, questionNumber]);

  const handleEndInterview = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCompleted(true);
    setVoiceState('completed');
    trackInterviewCompletion({
      interviewId: `live-${Date.now()}`,
      role: config.jobTitle,
      durationMinutes: Math.floor(elapsedSeconds / 60),
      questionsAsked: questionNumber - 1,
      questionsTotal: config.questionCount,
      completed: true,
    });
    setShowHireModal(true);
  }, [config.jobTitle, config.questionCount, elapsedSeconds, questionNumber]);

  const handleHireDecision = useCallback((decision: 'hire' | 'no-hire' | 'maybe') => {
    setHireDecision(decision);
    setShowHireModal(false);
    trackFeature('hire_decision_modal_opened', { decision });
    trackB2BFlow('first_live_interview_completed', { hire_decision: decision });
    setShowReportModal(true);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="min-h-screen bg-[#0C1017] flex flex-col text-white overflow-hidden" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <RecruiterHeader
        config={config}
        elapsed={formatTime(elapsedSeconds)}
        elapsedSeconds={elapsedSeconds}
        isRecording={isRecording}
        questionNumber={questionNumber}
        totalQuestions={config.questionCount}
        onEndInterview={handleEndInterview}
        onPostJob={() => setShowJobPostingModal(true)}
      />

      {/* Main layout: 3 columns */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: AI Suggestions + Notes */}
        <div className="w-72 xl:w-80 bg-[#0E1520] border-r border-[#1E2D3D] flex flex-col overflow-hidden shrink-0">
          <AIQuestionSuggestor
            suggestions={suggestedQuestions}
            isGenerating={isGeneratingSuggestions}
            currentCategory={currentCategory}
            onSelectQuestion={handleSelectQuestion}
            onRefresh={generateInitialSuggestions}
            categories={QUESTION_CATEGORIES}
            onCategoryChange={setCurrentCategory}
          />

          {/* Notes panel */}
          <div className="border-t border-[#1E2D3D] p-3 shrink-0">
            <button
              onClick={() => setShowNotes(v => !v)}
              className="w-full flex items-center justify-between text-[12px] font-600 text-[#7EC8C8] mb-2"
            >
              <span>📝 Recruiter Notes</span>
              <span className="text-[#4A6B7A]">{showNotes ? '▲' : '▼'}</span>
            </button>
            {showNotes && (
              <textarea
                value={recruiterNotes}
                onChange={e => setRecruiterNotes(e.target.value)}
                placeholder="Private notes — not visible to candidate..."
                rows={4}
                className="w-full bg-[#0C1017] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[12px] text-[#A8C5C5] placeholder:text-[#3A5060] resize-none focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50"
              />
            )}
          </div>
        </div>

        {/* CENTER: Video feeds + Q&A input */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <RecruiterVideoGrid
            config={config}
            voiceState={voiceState}
            isMicMuted={isMicMuted}
            isCameraOff={isCameraOff}
            qaHistory={qaHistory}
          />

          {/* Q&A Input Area */}
          <div className="bg-[#0E1520] border-t border-[#1E2D3D] p-4 space-y-3 shrink-0">
            {/* Current question */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-600 text-[#7EC8C8] uppercase tracking-wider mb-1 block">
                  Current Question (Q{questionNumber})
                </label>
                <textarea
                  value={currentQuestion}
                  onChange={e => setCurrentQuestion(e.target.value)}
                  placeholder="Type or select a question from AI suggestions..."
                  rows={2}
                  className="w-full bg-[#0C1017] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-[#3A5060] resize-none focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <select
                  value={currentCategory}
                  onChange={e => setCurrentCategory(e.target.value)}
                  className="bg-[#0C1017] border border-[#1E2D3D] rounded-lg px-2 py-1.5 text-[11px] text-[#A8C5C5] focus:outline-none focus:ring-1 focus:ring-[#2ABFBF]/50"
                >
                  {QUESTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Candidate answer */}
            <div>
              <label className="text-[10px] font-600 text-[#F5A623] uppercase tracking-wider mb-1 block">
                Candidate's Answer (type/transcribe)
              </label>
              <div className="flex gap-2">
                <textarea
                  value={candidateAnswerBuffer}
                  onChange={e => setCandidateAnswerBuffer(e.target.value)}
                  placeholder="Type or paste candidate's answer here for AI evaluation..."
                  rows={2}
                  className="flex-1 bg-[#0C1017] border border-[#1E2D3D] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-[#3A5060] resize-none focus:outline-none focus:ring-1 focus:ring-[#F5A623]/50 transition-colors"
                />
                <button
                  onClick={handleSubmitQA}
                  disabled={!currentQuestion.trim() || !candidateAnswerBuffer.trim() || isEvaluating}
                  className="px-4 py-2 rounded-lg bg-[#2ABFBF] hover:bg-[#25AAAA] text-[#0C1017] text-[13px] font-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 self-end"
                >
                  {isEvaluating ? '...' : 'Evaluate & Next'}
                </button>
              </div>
            </div>
          </div>

          <RecruiterControls
            isMicMuted={isMicMuted}
            isCameraOff={isCameraOff}
            isRecording={isRecording}
            onToggleMic={() => setIsMicMuted(v => !v)}
            onToggleCamera={() => setIsCameraOff(v => !v)}
            onToggleRecording={() => setIsRecording(v => !v)}
            onEndInterview={handleEndInterview}
            onPostJob={() => setShowJobPostingModal(true)}
          />
        </div>

        {/* RIGHT: Live Evaluation */}
        <div className="w-72 xl:w-80 bg-[#0E1520] border-l border-[#1E2D3D] flex flex-col overflow-hidden shrink-0">
          <LiveEvaluationPanel
            qaHistory={qaHistory}
            evaluationScores={evaluationScores}
            isEvaluating={isEvaluating}
            questionNumber={questionNumber}
            totalQuestions={config.questionCount}
          />
        </div>
      </div>

      {/* Modals */}
      {showHireModal && (
        <HireDecisionModal
          candidateName={config.candidateName}
          jobTitle={config.jobTitle}
          evaluationScores={evaluationScores}
          qaHistory={qaHistory}
          elapsed={formatTime(elapsedSeconds)}
          onDecide={handleHireDecision}
          onClose={() => setShowHireModal(false)}
        />
      )}

      {showReportModal && hireDecision && (
        <InterviewReportModal
          config={config}
          qaHistory={qaHistory}
          evaluationScores={evaluationScores}
          hireDecision={hireDecision}
          elapsed={formatTime(elapsedSeconds)}
          recruiterNotes={recruiterNotes}
          onClose={() => setShowReportModal(false)}
          onPostJob={() => { setShowReportModal(false); setShowJobPostingModal(true); }}
        />
      )}

      {showJobPostingModal && (
        <JobPostingModal
          config={config}
          onClose={() => setShowJobPostingModal(false)}
        />
      )}
    </div>
  );
}
