'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { mockLiveInterview } from '@/lib/mockData';
import InterviewHeader from './InterviewHeader';
import InterviewerPanel from './InterviewerPanel';
import QuestionDisplay from './QuestionDisplay';
import VoiceControls from './VoiceControls';
import TranscriptPanel from './TranscriptPanel';
import InterviewProgressBar from './InterviewProgressBar';
import EndInterviewModal from './EndInterviewModal';
import { toast } from 'sonner';
import { interviewService, candidateService, questionService, responseService } from '@/lib/services/interviewService';
import { createClient } from '@/lib/supabase/client';
import { speechToTextGroq } from '@/lib/ai/groqClient';
import InterviewCoverageTracker from './InterviewCoverageTracker';
import { speakWithElevenLabs, getInterviewerVoice } from '@/lib/ai/elevenLabsTTS';
import { trackEvent } from '@/lib/analytics';
import ProctoringEngine, { type ProctoringEvent, type ProctoringInsights, computeInsights } from '@/components/ProctoringEngine';


export type VoiceState =
  | 'idle' | 'listening' | 'processing' | 'interviewer_speaking' | 'candidate_speaking' | 'thinking' | 'error' | 'reconnecting' | 'completed' | 'generating';

export type InputMode = 'voice' | 'text';

interface LiveQuestion {
  id: string;
  dbId?: string;
  number: number;
  text: string;
  category: string;
  difficulty: string;
  technology?: string;
}

// Q&A pair for NLP context tracking
interface QAPair {
  question: string;
  answer: string;
  category: string;
  technology?: string;
}

// Resume context extracted from candidate profile
interface ResumeContext {
  candidateName: string;
  role: string;
  skills?: string[];
  experience?: string;
  resumeText?: string;
}

export default function LiveInterviewScreen() {
  const data = mockLiveInterview;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('interviewer_speaking');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [transcriptVisible, setTranscriptVisible] = useState(true);
  const [transcript, setTranscript] = useState(data.transcript);
  const [textAnswer, setTextAnswer] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [submittedResponses, setSubmittedResponses] = useState<Map<string, string>>(new Map());

  // NLP context tracking
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [resumeContext] = useState<ResumeContext>({
    candidateName: data.candidateName,
    role: data.role,
    skills: ['React', 'TypeScript', 'JavaScript', 'Performance Optimization', 'System Design'],
    experience: 'Senior level with 5+ years in frontend engineering',
  });
  const [askedTopics, setAskedTopics] = useState<string[]>([]);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // MediaRecorder refs for real voice capture
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Speech synthesis ref
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Determine interviewer voice based on interview type
  const interviewerVoice = getInterviewerVoice(data.role);

  // Map mock questions to live questions with DB IDs
  const liveQuestions = questions.length > 0 ? questions : data.questions.map((q, i) => ({
    ...q,
    number: i + 1,
  }));

  const currentQuestion = liveQuestions[currentQuestionIndex];

  // Speak text using ElevenLabs (Indian English accent) with Web Speech fallback
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') {
      setTimeout(() => onEnd?.(), 3000);
      return;
    }

    speakWithElevenLabs(text, {
      voiceGender: interviewerVoice.gender,
      voiceIndex: interviewerVoice.index,
      onStart: () => setVoiceState('interviewer_speaking'),
      onEnd: () => {
        setVoiceState('idle');
        onEnd?.();
      },
      onError: () => {
        // Fallback already handled inside speakWithElevenLabs
        setVoiceState('idle');
        onEnd?.();
      },
    });
  }, [interviewerVoice]);

  // Generate next contextual question using NLP API
  const generateContextualQuestion = useCallback(async (
    currentQAPairs: QAPair[],
    nextQuestionNumber: number,
    currentAskedTopics: string[]
  ): Promise<LiveQuestion | null> => {
    try {
      setIsGeneratingQuestion(true);
      setVoiceState('generating');

      const response = await fetch('/api/ai/contextual-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeContext,
          previousQA: currentQAPairs,
          questionNumber: nextQuestionNumber,
          totalQuestions: liveQuestions.length,
          askedTopics: currentAskedTopics,
        }),
      });

      if (!response.ok) {
        console.error('Contextual question API error:', response.status);
        return null;
      }

      const generated = await response.json();

      if (!generated?.question) return null;

      return {
        id: `q-ctx-${nextQuestionNumber}-${Date.now()}`,
        number: nextQuestionNumber,
        text: generated.question,
        category: generated.category || 'Technical',
        difficulty: generated.difficulty || 'Medium',
        technology: generated.technology || undefined,
      };
    } catch (err) {
      console.error('Failed to generate contextual question:', err);
      return null;
    } finally {
      setIsGeneratingQuestion(false);
    }
  }, [resumeContext, liveQuestions.length]);

  // Initialize interview in Supabase on mount
  useEffect(() => {
    initializeInterview();
    return () => {
      stopMicStream();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopMicStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const initializeInterview = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let candidateId: string | null = null;
      if (user) {
        let candidate = await candidateService.getByUserId(user.id);
        if (!candidate) {
          candidate = await candidateService.upsert({
            name: user.user_metadata?.full_name || data.candidateName,
            email: user.email || `${user.id}@interview.local`,
            role: data.role,
            user_id: user.id,
          });
        }
        candidateId = candidate?.id || null;
      }

      const dbQuestions = await questionService.getActive();

      if (dbQuestions.length > 0) {
        const mapped = dbQuestions.slice(0, data.questions.length).map((q, i) => ({
          id: `q-live-${i + 1}`,
          dbId: q.id,
          number: i + 1,
          text: q.text,
          category: q.category,
          difficulty: q.difficulty,
          technology: q.technology || undefined,
        }));
        setQuestions(mapped);
      }

      const interview = await interviewService.create({
        candidate_id: candidateId || undefined,
        role: data.role,
        company: data.company,
        department: data.department,
        interview_type: 'technical',
        status: 'in_progress',
        scheduled_at: new Date().toISOString(),
        question_count: data.questions.length,
        answered_count: 0,
      });

      if (interview) {
        setActiveInterviewId(interview.id);
        // GA: track interview start
        trackEvent('interview_start', {
          interview_id: interview.id,
          role: data.role,
          company: data.company,
          interview_type: 'technical',
          user_role: 'candidate',
        });
      }
    } catch (err) {
      console.error('initializeInterview error:', err);
    }
  };

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Speak question when question changes
  useEffect(() => {
    if (!currentQuestion) return;
    setVoiceState('interviewer_speaking');

    speakText(currentQuestion.text, () => {
      setVoiceState('idle');
    });

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestionIndex]);

  // Real microphone recording start
  const handleStartRecording = useCallback(async () => {
    if (voiceState !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm' : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250);
      setVoiceState('listening');
      toast('Recording started — speak your answer');
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        toast.error('Microphone permission denied. Please allow microphone access and try again.');
      } else {
        toast.error('Could not access microphone. Please check your device settings.');
      }
      setVoiceState('idle');
    }
  }, [voiceState]);

  // Stop recording and transcribe
  const handleStopRecording = useCallback(() => {
    if (voiceState !== 'listening') return;
    if (!mediaRecorderRef.current) return;

    setVoiceState('processing');

    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      stopMicStream();

      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (audioBlob.size < 1000) {
        toast.error('No audio detected. Please try again.');
        setVoiceState('idle');
        return;
      }

      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const audioFile = new File([audioBlob], `recording.${ext}`, { type: mimeType });

      try {
        const result = await speechToTextGroq(audioFile, 'en');

        let transcribedText = result?.text?.trim();
        if (transcribedText) {
          setTextAnswer(transcribedText);
          const newEntry = {
            id: `tr-stt-${Date.now()}`,
            speaker: 'candidate' as const,
            text: transcribedText,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
          setTranscript((prev) => [...prev, newEntry]);
          toast.success('Voice transcribed — review and submit');
          setInputMode('text');
        } else {
          toast.error('Could not transcribe audio. Please try again or use text mode.');
        }
      } catch (err) {
        console.error('STT error:', err);
        toast.error('Transcription failed. Please try again or switch to text mode.');
      } finally {
        setVoiceState('idle');
      }
    };

    recorder.stop();
  }, [voiceState]);

  const handleSubmitAnswer = useCallback(() => {
    if (voiceState === 'listening') {
      if (!mediaRecorderRef.current) return;
      setVoiceState('processing');

      const recorder = mediaRecorderRef.current;
      recorder.onstop = async () => {
        stopMicStream();

        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const audioFile = new File([audioBlob], `recording.${ext}`, { type: mimeType });

        let transcribedText = '';
        if (audioBlob.size >= 1000) {
          try {
            const result = await speechToTextGroq(audioFile, 'en');
            transcribedText = result?.text?.trim() || '';
          } catch {
            // proceed with empty text
          }
        }

        if (transcribedText) {
          setTextAnswer(transcribedText);
          setTimeout(() => submitAnswerWithText(transcribedText), 100);
        } else {
          toast.error('Could not transcribe audio. Please use text mode.');
          setVoiceState('idle');
        }
      };
      recorder.stop();
    } else {
      submitAnswer();
    }
  }, [voiceState, textAnswer, currentQuestion]);

  // Core function: submit answer + generate next contextual question
  const submitAnswerWithText = useCallback(async (answerText: string) => {
    if (!answerText.trim()) {
      toast.error('Please provide an answer before submitting');
      setVoiceState('idle');
      return;
    }

    const newQAPair: QAPair = {
      question: currentQuestion.text,
      answer: answerText,
      category: currentQuestion.category,
      technology: currentQuestion.technology,
    };

    const updatedQAHistory = [...qaHistory, newQAPair];
    setQaHistory(updatedQAHistory);

    // Track asked topics for gap analysis
    const newTopic = currentQuestion.technology || currentQuestion.category;
    const updatedTopics = [...askedTopics, newTopic];
    setAskedTopics(updatedTopics);

    setAnsweredQuestions((prev) => [...prev, currentQuestion.id]);

    if (activeInterviewId) {
      const questionDbId = (currentQuestion as any).dbId;
      if (questionDbId) {
        await responseService.submitResponse({
          interview_id: activeInterviewId,
          question_id: questionDbId,
          answer_text: answerText,
          answer_type: 'voice',
        });
      }
      await interviewService.update(activeInterviewId, {
        answered_count: answeredQuestions.length + 1,
      });
    }

    const newEntry = {
      id: `tr-live-${Date.now()}`,
      speaker: 'candidate' as const,
      text: answerText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setTranscript((prev) => [...prev, newEntry]);
    setTextAnswer('');
    setInputMode('voice');

    toast.success('Answer submitted');

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < liveQuestions.length) {
      // Generate contextual next question using NLP
      const nextQuestionNumber = nextIndex + 1;
      const contextualQuestion = await generateContextualQuestion(
        updatedQAHistory,
        nextQuestionNumber,
        updatedTopics
      );

      if (contextualQuestion) {
        // Replace the next question in the list with the AI-generated contextual one
        setQuestions((prev) => {
          const updated = [...(prev.length > 0 ? prev : liveQuestions)];
          updated[nextIndex] = contextualQuestion;
          return updated;
        });

        const nextEntry = {
          id: `tr-ai-${Date.now()}`,
          speaker: 'interviewer' as const,
          text: contextualQuestion.text,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setTranscript((prev) => [...prev, nextEntry]);
      } else {
        // Fallback to static question if generation fails
        const fallbackQ = liveQuestions[nextIndex];
        const nextEntry = {
          id: `tr-ai-${Date.now()}`,
          speaker: 'interviewer' as const,
          text: fallbackQ.text,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setTranscript((prev) => [...prev, nextEntry]);
      }

      setVoiceState('idle');
      setTimeout(() => {
        setCurrentQuestionIndex(nextIndex);
      }, 500);
    } else {
      setTimeout(async () => {
        if (activeInterviewId) {
          await interviewService.update(activeInterviewId, {
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_minutes: Math.round(elapsedSeconds / 60),
            answered_count: answeredQuestions.length + 1,
          });
        }
        // GA: track interview completion
        trackEvent('interview_complete', {
          interview_id: activeInterviewId || undefined,
          role: data.role,
          company: data.company,
          questions_answered: answeredQuestions.length + 1,
          duration_minutes: Math.round(elapsedSeconds / 60),
          user_role: 'candidate',
        });
        setIsCompleted(true);
        setVoiceState('completed');
        if (timerRef.current) clearInterval(timerRef.current);
        toast.success('Interview completed! Thank you for your time.');
      }, 1500);
    }
  }, [currentQuestion, currentQuestionIndex, liveQuestions, activeInterviewId, answeredQuestions, elapsedSeconds, qaHistory, askedTopics, generateContextualQuestion]);

  const submitAnswer = useCallback(async () => {
    const answerText = inputMode === 'text' ? textAnswer : '[Voice response recorded]';
    if (!answerText.trim() && inputMode === 'text') {
      toast.error('Please provide an answer before submitting');
      return;
    }

    const newQAPair: QAPair = {
      question: currentQuestion.text,
      answer: inputMode === 'text' ? answerText : 'Voice response submitted.',
      category: currentQuestion.category,
      technology: currentQuestion.technology,
    };

    const updatedQAHistory = [...qaHistory, newQAPair];
    setQaHistory(updatedQAHistory);

    const newTopic = currentQuestion.technology || currentQuestion.category;
    const updatedTopics = [...askedTopics, newTopic];
    setAskedTopics(updatedTopics);

    setAnsweredQuestions((prev) => [...prev, currentQuestion.id]);

    if (activeInterviewId) {
      const questionDbId = (currentQuestion as any).dbId;
      if (questionDbId) {
        await responseService.submitResponse({
          interview_id: activeInterviewId,
          question_id: questionDbId,
          answer_text: inputMode === 'text' ? answerText : undefined,
          answer_type: inputMode,
        });
      }
      await interviewService.update(activeInterviewId, {
        answered_count: answeredQuestions.length + 1,
      });
    }

    const newEntry = {
      id: `tr-live-${Date.now()}`,
      speaker: 'candidate' as const,
      text: inputMode === 'text' ? answerText : 'Voice response submitted successfully.',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setTranscript((prev) => [...prev, newEntry]);
    setTextAnswer('');

    toast.success('Answer submitted');

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < liveQuestions.length) {
      const nextQuestionNumber = nextIndex + 1;
      const contextualQuestion = await generateContextualQuestion(
        updatedQAHistory,
        nextQuestionNumber,
        updatedTopics
      );

      if (contextualQuestion) {
        setQuestions((prev) => {
          const updated = [...(prev.length > 0 ? prev : liveQuestions)];
          updated[nextIndex] = contextualQuestion;
          return updated;
        });

        const nextEntry = {
          id: `tr-ai-${Date.now()}`,
          speaker: 'interviewer' as const,
          text: contextualQuestion.text,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setTranscript((prev) => [...prev, nextEntry]);
      } else {
        const fallbackQ = liveQuestions[nextIndex];
        const nextEntry = {
          id: `tr-ai-${Date.now()}`,
          speaker: 'interviewer' as const,
          text: fallbackQ.text,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setTranscript((prev) => [...prev, nextEntry]);
      }

      setVoiceState('idle');
      setTimeout(() => {
        setCurrentQuestionIndex(nextIndex);
      }, 500);
    } else {
      setTimeout(async () => {
        if (activeInterviewId) {
          await interviewService.update(activeInterviewId, {
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_minutes: Math.round(elapsedSeconds / 60),
            answered_count: answeredQuestions.length + 1,
          });
        }
        // GA: track interview completion (submitAnswer path)
        trackEvent('interview_complete', {
          interview_id: activeInterviewId || undefined,
          role: data.role,
          company: data.company,
          questions_answered: answeredQuestions.length + 1,
          duration_minutes: Math.round(elapsedSeconds / 60),
          user_role: 'candidate',
        });
        setIsCompleted(true);
        setVoiceState('completed');
        if (timerRef.current) clearInterval(timerRef.current);
        toast.success('Interview completed! Thank you for your time.');
      }, 1500);
    }
  }, [inputMode, textAnswer, currentQuestion, currentQuestionIndex, liveQuestions, activeInterviewId, answeredQuestions, elapsedSeconds, qaHistory, askedTopics, generateContextualQuestion]);

  const handleReplayQuestion = useCallback(() => {
    if (!currentQuestion) return;
    setVoiceState('interviewer_speaking');
    toast('Replaying question...');
    speakText(currentQuestion.text, () => {
      setVoiceState('idle');
    });
  }, [currentQuestion, speakText]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [proctoringInsights, setProctoringInsights] = useState<ProctoringInsights>({
    events: [], tabSwitchCount: 0, fullscreenExitCount: 0, faceNotDetectedSeconds: 0,
    audioAnomalies: 0, overallRiskScore: 0, riskLevel: 'clean', summary: 'No suspicious activity detected.',
  });

  const handleProctoringEvent = useCallback((event: ProctoringEvent) => {
    setProctoringEvents((prev) => {
      const updated = [...prev, event];
      setProctoringInsights(computeInsights(updated));
      return updated;
    });
  }, []);

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center fade-in">
          <div className="w-16 h-16 rounded-full bg-success-bg border-2 border-success flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-700 text-foreground mb-2">Interview Completed</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Thank you, {data.candidateName}. Your responses have been submitted for evaluation. You will receive your results within 24 hours.
          </p>
          <div className="bg-muted rounded-lg p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-600 tabular-nums">{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Questions answered</span>
              <span className="font-600 tabular-nums">{answeredQuestions.length} / {liveQuestions.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-600">{data.role}</span>
            </div>
            {activeInterviewId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saved to</span>
                <span className="font-600 text-primary text-xs truncate max-w-[120px]">Database ✓</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/interview-results"
              className="block w-full bg-primary hover:bg-primary/90 text-white font-600 text-sm py-2.5 rounded-md transition-all duration-150 active:scale-95"
            >
              View Results & Feedback
            </Link>
            <Link
              href="/"
              className="block w-full bg-muted hover:bg-muted/80 text-foreground font-500 text-sm py-2.5 rounded-md transition-all duration-150 active:scale-95"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col text-white overflow-hidden">
      <InterviewHeader
        company={data.company}
        role={data.role}
        elapsed={formatTime(elapsedSeconds)}
        totalDuration={data.duration}
        elapsedSeconds={elapsedSeconds}
        onEndInterview={() => setShowEndModal(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <InterviewProgressBar
            current={currentQuestionIndex + 1}
            total={liveQuestions.length}
            answered={answeredQuestions.length}
          />

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
              <div className="w-full max-w-2xl space-y-6">
                <InterviewerPanel voiceState={voiceState} />

                {/* Generating question indicator */}
                {isGeneratingQuestion && (
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm text-slate-300">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>Generating contextual follow-up question based on your answer…</span>
                  </div>
                )}

                <QuestionDisplay
                  question={currentQuestion}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={liveQuestions.length}
                />
              </div>
            </div>

            {/* Right panel: Coverage Tracker + Transcript */}
            <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col overflow-hidden">
              {/* Coverage tracker always visible */}
              <div className="shrink-0 p-3 border-b border-white/10">
                <InterviewCoverageTracker
                  askedTopics={askedTopics}
                  totalQuestions={liveQuestions.length}
                  answeredCount={answeredQuestions.length}
                  currentTopic={currentQuestion?.technology || currentQuestion?.category}
                  resumeSkills={resumeContext.skills}
                />
              </div>

              {transcriptVisible && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <TranscriptPanel
                    transcript={transcript}
                    onClose={() => setTranscriptVisible(false)}
                  />
                </div>
              )}
            </div>
          </div>

          <VoiceControls
            voiceState={voiceState}
            inputMode={inputMode}
            textAnswer={textAnswer}
            onTextChange={setTextAnswer}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onSubmitAnswer={handleSubmitAnswer}
            onReplayQuestion={handleReplayQuestion}
            onToggleMode={() => {
              if (voiceState === 'listening' && mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                stopMicStream();
                setVoiceState('idle');
              }
              setInputMode((m) => m === 'voice' ? 'text' : 'voice');
            }}
            onToggleTranscript={() => setTranscriptVisible((v) => !v)}
            transcriptVisible={transcriptVisible}
          />
        </div>
      </div>

      {/* Proctoring Engine — always active for mock interviews */}
      <ProctoringEngine
        sessionId={activeInterviewId || `mock-${Date.now()}`}
        onEvent={handleProctoringEvent}
        onInsightsUpdate={setProctoringInsights}
        showOverlay={true}
        requireFullscreen={false}
      />

      {showEndModal && (
        <EndInterviewModal
          answeredCount={answeredQuestions.length}
          totalCount={liveQuestions.length}
          elapsed={formatTime(elapsedSeconds)}
          onConfirm={async () => {
            if (activeInterviewId) {
              await interviewService.update(activeInterviewId, {
                status: 'completed',
                completed_at: new Date().toISOString(),
                duration_minutes: Math.round(elapsedSeconds / 60),
                answered_count: answeredQuestions.length,
              });
            }
            // GA: track interview completion (manual end)
            trackEvent('interview_complete', {
              interview_id: activeInterviewId || undefined,
              role: data.role,
              company: data.company,
              questions_answered: answeredQuestions.length,
              duration_minutes: Math.round(elapsedSeconds / 60),
              user_role: 'candidate',
              ended_early: true,
            });
            setIsCompleted(true);
            setVoiceState('completed');
            if (timerRef.current) clearInterval(timerRef.current);
          }}
          onCancel={() => setShowEndModal(false)}
        />
      )}
    </div>
  );
}