'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import InterviewHeader from './InterviewHeader';
import InterviewerPanel from './InterviewerPanel';
import QuestionDisplay from './QuestionDisplay';
import VoiceControls from './VoiceControls';
import TranscriptPanel from './TranscriptPanel';
import InterviewProgressBar from './InterviewProgressBar';
import EndInterviewModal from './EndInterviewModal';
import { toast } from 'sonner';
import { interviewService, candidateService, questionService, responseService, interviewResultsService } from '@/lib/services/interviewService';
import { createClient } from '@/lib/supabase/client';
import { speechToTextGroq } from '@/lib/ai/groqClient';
import InterviewCoverageTracker from './InterviewCoverageTracker';
import { speakWithElevenLabs, getInterviewerVoice, stopCurrentSpeech } from '@/lib/ai/elevenLabsTTS';
import { trackEvent } from '@/lib/analytics';
import { csrfHeaders } from '@/lib/api/apiClient';
import ProctoringEngine, { type ProctoringEvent, type ProctoringInsights, computeInsights } from '@/components/ProctoringEngine';
import { proctoringService } from '@/lib/services/proctoringService';
import {
  loadInterviewSessionConfig,
  clearInterviewSessionConfig,
  questionTargetForDuration,
  type InterviewSessionConfig,
} from '@/lib/interview/sessionConfig';
import { CREDIT_COSTS, INTERVIEW_DURATION_OPERATIONS } from '@/lib/hooks/useCreditBalance';


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

interface TranscriptLine {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
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
  const [sessionConfig, setSessionConfig] = useState<InterviewSessionConfig | null>(null);
  const [candidateName, setCandidateName] = useState('Candidate');
  const [initError, setInitError] = useState<string | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('generating');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [transcriptVisible, setTranscriptVisible] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [displayPhase, setDisplayPhase] = useState<'loading' | 'greeting' | 'question'>('loading');
  const [submittedResponses, setSubmittedResponses] = useState<Map<string, string>>(new Map());

  // NLP context tracking
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const sessionRole = sessionConfig?.role?.trim() || 'General Interview';
  const sessionCompany = sessionConfig?.company?.trim() || 'Unknown';
  const sessionDurationMinutes = sessionConfig?.durationMinutes ?? 60;
  const sessionQuestionTarget =
    sessionConfig?.questionTarget ?? questionTargetForDuration(sessionDurationMinutes);

  const [resumeContext, setResumeContext] = useState<ResumeContext>({
    candidateName: 'Candidate',
    role: 'General Interview',
    skills: [],
    experience: undefined,
  });
  // Keep resume role in sync with session when available (updated after mount)
  const effectiveResumeContext = useMemo(
    () => ({
      ...resumeContext,
      candidateName,
      role: sessionRole,
      skills: sessionConfig?.subjectName
        ? [sessionConfig.subjectName, ...(resumeContext.skills ?? []).slice(0, 4)]
        : resumeContext.skills,
    }),
    [resumeContext, candidateName, sessionRole, sessionConfig?.subjectName]
  );
  const [askedTopics, setAskedTopics] = useState<string[]>([]);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [proctoringInsights, setProctoringInsights] = useState<ProctoringInsights>({
    events: [], tabSwitchCount: 0, fullscreenExitCount: 0, faceNotDetectedSeconds: 0,
    audioAnomalies: 0, overallRiskScore: 0, riskLevel: 'clean', summary: 'No suspicious activity detected.',
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const introDoneRef = useRef(false);
  const spokenQuestionKeyRef = useRef<string | null>(null);
  const speakGenerationRef = useRef(0);
  const proctoringEventsRef = useRef<ProctoringEvent[]>([]);
  const proctoringFlushedRef = useRef(false);

  const flushProctoring = useCallback(async (interviewId: string | null) => {
    if (proctoringFlushedRef.current) return;
    const events = proctoringEventsRef.current;
    if (!events.length || !interviewId) return;
    proctoringFlushedRef.current = true;
    const result = await proctoringService.flushEvents(events, {
      sessionId: interviewId,
      interviewId,
    });
    if (result.error) {
      proctoringFlushedRef.current = false;
      console.warn('Proctoring flush skipped:', result.error);
    }
  }, []);

  const greetingText = useMemo(
    () =>
      `Hello, welcome to your technical interview for the ${sessionRole} position at ${sessionCompany}. ` +
      `I'm your AI interviewer today. We'll cover technical and behavioral topics. Let's begin.`,
    [sessionRole, sessionCompany]
  );

  // MediaRecorder refs for real voice capture
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Speech synthesis ref
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stable interviewer voice for this session — random male/female from ElevenLabs pool
  // Empty deps: pick once on mount so the same voice is used for the whole interview
  const interviewerVoice = useMemo(() => getInterviewerVoice(), []);

  // Only use loaded questions — never swap mock → DB mid-speech
  const liveQuestions = questions;

  const currentQuestion = liveQuestions[currentQuestionIndex];

  const appendTranscript = useCallback((speaker: 'interviewer' | 'candidate', text: string) => {
    const normalized = text.trim();
    setTranscript((prev) => {
      // Avoid duplicate interviewer lines (e.g. Strict Mode remount / question reload)
      if (
        speaker === 'interviewer' &&
        prev.some((e) => e.speaker === 'interviewer' && e.text.trim() === normalized)
      ) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          speaker,
          text,
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        },
      ];
    });
  }, []);

  // Speak text using ElevenLabs (Indian English accent) with Web Speech fallback
  const speakTextAsync = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined') {
        setTimeout(resolve, 3000);
        return;
      }

      speakWithElevenLabs(text, {
        voiceGender: interviewerVoice.gender,
        voiceIndex: interviewerVoice.index,
        onStart: () => setVoiceState('interviewer_speaking'),
        onEnd: () => resolve(),
        onError: () => resolve(),
      });
    });
  }, [interviewerVoice.gender, interviewerVoice.index]);

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    speakTextAsync(text).then(() => {
      setVoiceState('idle');
      onEnd?.();
    });
  }, [speakTextAsync]);

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
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          resumeContext: effectiveResumeContext,
          previousQA: currentQAPairs,
          questionNumber: nextQuestionNumber,
          totalQuestions: liveQuestions.length,
          askedTopics: currentAskedTopics,
        }),
      });

      if (!response.ok) {
        console.warn('Contextual question API unavailable:', response.status);
        return null;
      }

      const generated = await response.json();

      if (!generated?.question) return null;

      // Persist generated question so responses can be saved + evaluated
      const dbQuestion = await questionService.create({
        text: generated.question,
        category: generated.category || 'Technical',
        difficulty: generated.difficulty || 'Medium',
        technology: generated.technology || sessionConfig?.subjectName || null,
        is_active: true,
      });

      return {
        id: `q-ctx-${nextQuestionNumber}-${Date.now()}`,
        dbId: dbQuestion?.id,
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
  }, [effectiveResumeContext, liveQuestions.length, sessionConfig?.subjectName]);

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
      const config = loadInterviewSessionConfig();
      setSessionConfig(config);
      setInitError(null);

      if (!config) {
        setInitError('No interview setup found. Choose a duration and subject from Interview Setup before starting.');
        setQuestions([]);
        return;
      }

      const durationMinutes = config.durationMinutes ?? 60;
      const questionTarget =
        config.questionTarget ?? questionTargetForDuration(durationMinutes);
      const subjectName = config.subjectName?.toLowerCase();
      const role = config.role?.trim() || 'General Interview';
      const company = config.company?.trim() || 'Unknown';

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const displayName =
        user?.user_metadata?.full_name?.trim() ||
        user?.email?.split('@')[0] ||
        'Candidate';
      setCandidateName(displayName);
      setResumeContext((prev) => ({
        ...prev,
        candidateName: displayName,
        role,
        skills: config.subjectName ? [config.subjectName] : [],
      }));

      let candidateId: string | null = null;
      if (user) {
        let candidate = await candidateService.getByUserId(user.id);
        if (!candidate) {
          candidate = await candidateService.upsert({
            name: displayName,
            email: user.email || `${user.id}@interview.local`,
            role,
            user_id: user.id,
          });
        } else if (candidate.name) {
          setCandidateName(candidate.name);
          setResumeContext((prev) => ({ ...prev, candidateName: candidate!.name }));
        }
        candidateId = candidate?.id || null;
      }

      const dbQuestions = await questionService.getActive();
      let mapped: LiveQuestion[] = [];

      if (dbQuestions.length > 0) {
        let filtered = dbQuestions;
        if (subjectName) {
          const bySubject = dbQuestions.filter((q) => {
            const tech = (q.technology || '').toLowerCase();
            const text = (q.text || '').toLowerCase();
            const cat = (q.category || '').toLowerCase();
            return (
              tech.includes(subjectName) ||
              text.includes(subjectName) ||
              cat.includes(subjectName) ||
              tech.includes(config.subjectId || '')
            );
          });
          if (bySubject.length > 0) filtered = bySubject;
        }
        mapped = filtered.slice(0, questionTarget).map((q, i) => ({
          id: `q-live-${i + 1}`,
          dbId: q.id,
          number: i + 1,
          text: q.text,
          category: q.category,
          difficulty: q.difficulty,
          technology: q.technology || undefined,
        }));
      }

      // No mock bank — if DB empty, try one AI-generated opener
      if (mapped.length === 0) {
        try {
          const genRes = await fetch('/api/ai/contextual-questions', {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              resumeContext: {
                candidateName: displayName,
                role,
                skills: config.subjectName ? [config.subjectName] : [],
              },
              previousQA: [],
              questionNumber: 1,
              totalQuestions: questionTarget,
              askedTopics: [],
            }),
          });
          if (genRes.ok) {
            const generated = await genRes.json();
            if (generated?.question) {
              mapped = [{
                id: 'q-live-1',
                number: 1,
                text: generated.question,
                category: generated.category || 'Technical',
                difficulty: generated.difficulty || 'Medium',
                technology: generated.technology || config.subjectName || undefined,
              }];
            }
          }
        } catch (genErr) {
          console.warn('AI opener generation failed:', genErr);
        }
      }

      if (mapped.length === 0) {
        setInitError('No interview questions available. Add questions to the bank or try again when AI generation is available.');
        setQuestions([]);
        return;
      }

      setQuestions(mapped);

      const interview = await interviewService.create({
        candidate_id: candidateId || undefined,
        role,
        company,
        department: null,
        interview_type: 'technical',
        status: 'in_progress',
        scheduled_at: new Date().toISOString(),
        question_count: mapped.length,
        answered_count: 0,
      });

      if (interview) {
        setActiveInterviewId(interview.id);

        // Consume credits for the selected duration (best-effort)
        try {
          const op = INTERVIEW_DURATION_OPERATIONS[durationMinutes as 20 | 30 | 45 | 60];
          if (op) {
            await fetch('/api/credits/consume', {
              method: 'POST',
              headers: csrfHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({
                action_type: 'consume',
                feature: op,
                credits: CREDIT_COSTS[op],
                reference_id: interview.id,
                reference_type: 'interview',
              }),
            });
          }
        } catch (creditErr) {
          console.warn('Credit consume skipped:', creditErr);
        }

        trackEvent('interview_start', {
          interview_id: interview.id,
          role,
          company,
          interview_type: 'technical',
          user_role: 'candidate',
          duration_minutes: durationMinutes,
          subject: config.subjectName,
        });
      }
    } catch (err) {
      console.error('initializeInterview error:', err);
      setQuestions([]);
      setInitError('Could not start the interview. Please return to Interview Setup and try again.');
    } finally {
      setQuestionsReady(true);
    }
  };

  // Elapsed timer + hard stop at selected duration
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const timeUpTriggeredRef = useRef(false);

  useEffect(() => {
    if (isCompleted || !questionsReady || timeUpTriggeredRef.current) return;
    const limitSeconds = sessionDurationMinutes * 60;
    if (elapsedSeconds < limitSeconds) return;
    if (voiceState !== 'idle' && voiceState !== 'listening') return;

    timeUpTriggeredRef.current = true;
    toast.warning('Time is up — wrapping up the interview.');
    if (timerRef.current) clearInterval(timerRef.current);

    void (async () => {
      if (activeInterviewId) {
        await interviewService.update(activeInterviewId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_minutes: sessionDurationMinutes,
          answered_count: answeredQuestions.length,
        });
        try {
          await fetch('/api/ai/evaluate', {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ interview_id: activeInterviewId }),
          });
        } catch {}
      }
      clearInterviewSessionConfig();
      setIsCompleted(true);
      setVoiceState('completed');
    })();
  }, [
    elapsedSeconds,
    sessionDurationMinutes,
    isCompleted,
    questionsReady,
    voiceState,
    activeInterviewId,
    answeredQuestions.length,
  ]);

  // Interview hierarchy: greeting (once) → ask current question → wait for candidate
  // Waits until questions are loaded so we never mock→DB swap mid-speech
  useEffect(() => {
    if (!questionsReady || !currentQuestion?.text || isCompleted) return;

    // Index-only key — identity changes from DB remaps must not re-ask
    const speakKey = String(currentQuestionIndex);
    if (spokenQuestionKeyRef.current === speakKey) return;

    const generation = ++speakGenerationRef.current;
    let cancelled = false;

    const run = async () => {
      setVoiceState('interviewer_speaking');

      // Step 1: greeting only at the very start — show in card, then speak, then transcript
      if (!introDoneRef.current && currentQuestionIndex === 0) {
        setDisplayPhase('greeting');
        await speakTextAsync(greetingText);
        if (cancelled || generation !== speakGenerationRef.current) return;
        introDoneRef.current = true;
        appendTranscript('interviewer', greetingText);
      }

      if (cancelled || generation !== speakGenerationRef.current) return;

      // Step 2: show + ask the current question, then wait for the candidate
      setDisplayPhase('question');
      await speakTextAsync(currentQuestion.text);
      if (cancelled || generation !== speakGenerationRef.current) return;

      appendTranscript('interviewer', currentQuestion.text);
      spokenQuestionKeyRef.current = speakKey;
      setVoiceState('idle');
    };

    run();

    return () => {
      cancelled = true;
      stopCurrentSpeech();
      // Do not clear spokenQuestionKeyRef — prevents Strict Mode remount from re-asking
      // completed questions. Incomplete asks retry because speakKey was never recorded.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak only when question index advances after ready
  }, [questionsReady, currentQuestionIndex, currentQuestion?.text, isCompleted, greetingText, speakTextAsync, appendTranscript]);

  // When contextual generation replaces the next question text before we speak it,
  // allow the effect to pick up the new text (speakKey not yet recorded).
  // No extra logic needed — spokenQuestionKeyRef is set only after speech completes.

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
          // Keep for review — transcript entry is added only on submit
          setTextAnswer(transcribedText);
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
      return;
    }

    // Require a real answer — never auto-submit placeholder voice responses
    if (!textAnswer.trim()) {
      toast.error(inputMode === 'voice'
        ? 'Record your answer first, then submit'
        : 'Please type an answer before submitting');
      return;
    }

    submitAnswerWithText(textAnswer.trim());
  }, [voiceState, textAnswer, inputMode, currentQuestion]);

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
      let questionDbId = currentQuestion.dbId;
      // Ensure every answered question has a DB row (needed for evaluate)
      if (!questionDbId) {
        const created = await questionService.create({
          text: currentQuestion.text,
          category: currentQuestion.category,
          difficulty: currentQuestion.difficulty,
          technology: currentQuestion.technology || sessionConfig?.subjectName || null,
          is_active: true,
        });
        questionDbId = created?.id;
        if (questionDbId) {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === currentQuestion.id ? { ...q, dbId: questionDbId } : q
            )
          );
        }
      }
      if (questionDbId) {
        await responseService.submitResponse({
          interview_id: activeInterviewId,
          question_id: questionDbId,
          answer_text: answerText,
          answer_type: inputMode === 'text' ? 'text' : 'voice',
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
          const updated = [...prev];
          if (updated[nextIndex]) {
            updated[nextIndex] = contextualQuestion;
          }
          return updated;
        });
      }

      // Advance — speak effect will ask the next question and append it to the transcript
      setVoiceState('interviewer_speaking');
      setTimeout(() => {
        setCurrentQuestionIndex(nextIndex);
      }, 300);
    } else {
      setTimeout(async () => {
        if (activeInterviewId) {
          await interviewService.update(activeInterviewId, {
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_minutes: Math.round(elapsedSeconds / 60),
            answered_count: answeredQuestions.length + 1,
          });

          // Trigger AI evaluation (persists scores to interview_results)
          try {
            await fetch('/api/ai/evaluate', {
              method: 'POST',
              headers: csrfHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({ interview_id: activeInterviewId }),
            });
          } catch (evalErr) {
            console.warn('AI evaluate skipped:', evalErr);
          }

          // Append proctoring summary after evaluate so it is not overwritten
          try {
            await flushProctoring(activeInterviewId);
            const existing = await interviewResultsService.getByInterviewId(activeInterviewId);
            const highlights = Array.isArray(existing?.transcript_highlights)
              ? [...existing.transcript_highlights]
              : [];
            highlights.push(
              `Proctoring risk: ${proctoringInsights.riskLevel} (score ${proctoringInsights.overallRiskScore})`,
              proctoringInsights.summary
            );
            await interviewResultsService.upsert({
              interview_id: activeInterviewId,
              transcript_highlights: highlights.slice(0, 12),
            });
          } catch (procErr) {
            console.warn('Proctoring summary save skipped:', procErr);
          }
        }

        clearInterviewSessionConfig();

        trackEvent('interview_complete', {
          interview_id: activeInterviewId || undefined,
          role: sessionRole,
          company: sessionCompany,
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
  }, [currentQuestion, currentQuestionIndex, liveQuestions, activeInterviewId, answeredQuestions, elapsedSeconds, qaHistory, askedTopics, generateContextualQuestion, inputMode, sessionConfig?.subjectName, sessionRole, sessionCompany, proctoringInsights, flushProctoring]);

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

  const handleProctoringEvent = useCallback((event: ProctoringEvent) => {
    setProctoringEvents((prev) => {
      const updated = [...prev, event];
      proctoringEventsRef.current = updated;
      setProctoringInsights(computeInsights(updated));
      return updated;
    });
  }, []);

  if (initError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center fade-in space-y-4">
          <h1 className="text-xl font-700 text-foreground">Cannot start interview</h1>
          <p className="text-sm text-muted-foreground">{initError}</p>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/interview-setup"
              className="block w-full bg-primary hover:bg-primary/90 text-white font-600 text-sm py-2.5 rounded-md transition-all"
            >
              Go to Interview Setup
            </Link>
            <Link
              href="/"
              className="block w-full bg-muted hover:bg-muted/80 text-foreground font-500 text-sm py-2.5 rounded-md transition-all"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            Thank you, {candidateName}. Your responses have been submitted for evaluation. You will receive your results within 24 hours.
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
              <span className="font-600">{sessionRole}</span>
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
        company={sessionCompany}
        role={sessionRole}
        elapsed={formatTime(elapsedSeconds)}
        totalDuration={sessionDurationMinutes}
        elapsedSeconds={elapsedSeconds}
        onEndInterview={() => setShowEndModal(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <InterviewProgressBar
            current={questionsReady ? currentQuestionIndex + 1 : 0}
            total={liveQuestions.length || sessionQuestionTarget}
            answered={answeredQuestions.length}
          />

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
              <div className="w-full max-w-2xl space-y-6">
                <InterviewerPanel voiceState={voiceState} company={sessionCompany} />

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
                  totalQuestions={liveQuestions.length || sessionQuestionTarget}
                  phase={displayPhase}
                  greetingText={greetingText}
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
              await flushProctoring(activeInterviewId);
            }
            // GA: track interview completion (manual end)
            trackEvent('interview_complete', {
              interview_id: activeInterviewId || undefined,
              role: sessionRole,
              company: sessionCompany,
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