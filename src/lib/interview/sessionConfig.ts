/**
 * Client-side interview session config passed from setup/subject pages
 * into the live interview via sessionStorage.
 */

export const INTERVIEW_SESSION_KEY = 'interview_session_config';

export interface InterviewSessionConfig {
  durationMinutes: 20 | 30 | 45 | 60;
  subjectId?: string;
  subjectName?: string;
  role?: string;
  company?: string;
  questionTarget?: number;
  createdAt: number;
}

const DURATION_QUESTION_TARGETS: Record<number, number> = {
  20: 5,
  30: 8,
  45: 12,
  60: 16,
};

export function questionTargetForDuration(minutes: number): number {
  return DURATION_QUESTION_TARGETS[minutes] ?? 8;
}

export function saveInterviewSessionConfig(
  config: Omit<InterviewSessionConfig, 'createdAt' | 'questionTarget'> & {
    questionTarget?: number;
  }
): void {
  if (typeof window === 'undefined') return;
  const payload: InterviewSessionConfig = {
    ...config,
    questionTarget: config.questionTarget ?? questionTargetForDuration(config.durationMinutes),
    createdAt: Date.now(),
  };
  try {
    sessionStorage.setItem(INTERVIEW_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function loadInterviewSessionConfig(): InterviewSessionConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(INTERVIEW_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InterviewSessionConfig;
    if (!parsed?.durationMinutes) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearInterviewSessionConfig(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(INTERVIEW_SESSION_KEY);
  } catch {
    // ignore
  }
}
