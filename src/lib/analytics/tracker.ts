/**
 * Analytics Tracking — Conversion Funnels, Feature Adoption & ROI Metrics
 *
 * Tracks:
 *  - Recruiter conversion funnel (signup → job post → interview → hire decision)
 *  - B2B signup-to-interview flow
 *  - Interview completion rates
 *  - Plan upgrade paths
 *  - Feature adoption metrics
 *
 * Usage:
 *   import { track, trackFunnel, useAnalytics } from '@/lib/analytics/tracker';
 */

'use client';

// ─── Event Catalogue ──────────────────────────────────────────────────────────

export type FunnelStage =
  | 'signup_started' |'signup_completed' |'profile_completed' |'first_job_posted' |'first_interview_scheduled' |'first_interview_completed' |'hire_decision_made' |'plan_upgrade_viewed' |'plan_upgraded';

export type FeatureEvent =
  | 'ai_question_suggestor_used' |'live_evaluation_panel_viewed' |'hire_decision_modal_opened' |'interview_report_downloaded' |'job_posting_modal_opened' |'job_posted_to_portal' |'candidate_search_used' |'pipeline_tab_viewed' |'analytics_tab_viewed' |'recruiter_notes_used' |'mock_interview_started' |'mock_interview_completed' |'lsrw_assessment_started' |'coding_assessment_started' |'resume_roadmap_viewed' |'subscription_page_viewed' |'payment_initiated' |'payment_completed' |'payment_failed';

export interface TrackPayload {
  event: FunnelStage | FeatureEvent | string;
  properties?: Record<string, string | number | boolean | null>;
  userId?: string;
  sessionId?: string;
}

// ─── Session ID (browser-safe) ────────────────────────────────────────────────

let _sessionId: string | null = null;

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  if (!_sessionId) {
    _sessionId =
      sessionStorage.getItem('_tid') ??
      (() => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem('_tid', id);
        return id;
      })();
  }
  return _sessionId;
}

// ─── Core Track Function ──────────────────────────────────────────────────────

export function track(payload: TrackPayload): void {
  if (typeof window === 'undefined') return;

  const enriched = {
    ...payload,
    sessionId: payload.sessionId ?? getSessionId(),
    timestamp: new Date().toISOString(),
    url: window.location.pathname,
    referrer: document.referrer || null,
  };

  // 1. Console log in dev
  if (process.env.NODE_ENV === 'development') {
    console.info('[Analytics]', enriched.event, enriched.properties ?? '');
  }

  // 2. Push to dataLayer (Google Tag Manager / GA4)
  if (typeof (window as any).dataLayer !== 'undefined') {
    (window as any).dataLayer.push({
      event: enriched.event,
      ...enriched.properties,
      session_id: enriched.sessionId,
    });
  }

  // 3. Persist to localStorage for session replay / debugging
  try {
    const key = '_analytics_events';
    const existing: any[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    existing.push(enriched);
    // Keep last 200 events only
    if (existing.length > 200) existing.splice(0, existing.length - 200);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // localStorage may be blocked in private mode
  }
}

// ─── Funnel Tracking ──────────────────────────────────────────────────────────

const FUNNEL_STAGES: FunnelStage[] = [
  'signup_started',
  'signup_completed',
  'profile_completed',
  'first_job_posted',
  'first_interview_scheduled',
  'first_interview_completed',
  'hire_decision_made',
  'plan_upgrade_viewed',
  'plan_upgraded',
];

export function trackFunnel(
  stage: FunnelStage,
  properties?: Record<string, string | number | boolean | null>
): void {
  const stageIndex = FUNNEL_STAGES.indexOf(stage);
  track({
    event: stage,
    properties: {
      funnel: 'recruiter_conversion',
      funnel_stage_index: stageIndex,
      funnel_stage_name: stage,
      ...properties,
    },
  });
}

// ─── Interview Completion Rate Tracker ───────────────────────────────────────

export function trackInterviewCompletion(params: {
  interviewId: string;
  role: string;
  durationMinutes: number;
  questionsAsked: number;
  questionsTotal: number;
  completed: boolean;
  hireDecision?: 'hire' | 'no-hire' | 'maybe';
}): void {
  const completionRate =
    params.questionsTotal > 0
      ? Math.round((params.questionsAsked / params.questionsTotal) * 100)
      : 0;

  track({
    event: params.completed ? 'mock_interview_completed' : 'mock_interview_started',
    properties: {
      interview_id: params.interviewId,
      role: params.role,
      duration_minutes: params.durationMinutes,
      questions_asked: params.questionsAsked,
      questions_total: params.questionsTotal,
      completion_rate_pct: completionRate,
      hire_decision: params.hireDecision ?? null,
    },
  });
}

// ─── Plan Upgrade Path Tracker ────────────────────────────────────────────────

export function trackPlanUpgrade(params: {
  fromPlan: string;
  toPlan: string;
  provider: 'razorpay' | 'stripe';
  amountInr?: number;
  trigger?: string; // e.g. 'credit_exhausted', 'feature_gate', 'manual'
}): void {
  trackFunnel('plan_upgraded', {
    from_plan: params.fromPlan,
    to_plan: params.toPlan,
    payment_provider: params.provider,
    amount_inr: params.amountInr ?? null,
    upgrade_trigger: params.trigger ?? 'manual',
  });
}

// ─── B2B Signup-to-Interview Flow ────────────────────────────────────────────

export function trackB2BFlow(
  stage:
    | 'recruiter_signup_started' |'recruiter_signup_completed' |'first_candidate_invited' |'first_live_interview_started' |'first_live_interview_completed',
  properties?: Record<string, string | number | boolean | null>
): void {
  track({
    event: stage,
    properties: {
      funnel: 'b2b_signup_to_interview',
      ...properties,
    },
  });
}

// ─── Feature Adoption Tracker ─────────────────────────────────────────────────

export function trackFeature(
  feature: FeatureEvent,
  properties?: Record<string, string | number | boolean | null>
): void {
  track({ event: feature, properties });
}

// ─── Session Summary (for ROI reports) ───────────────────────────────────────

export interface SessionSummary {
  sessionId: string;
  eventsCount: number;
  featuresUsed: string[];
  funnelStagesReached: FunnelStage[];
  durationMs: number;
  startTime: string;
}

export function getSessionSummary(): SessionSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('_analytics_events');
    if (!raw) return null;
    const events: any[] = JSON.parse(raw);
    const sessionId = getSessionId();
    const sessionEvents = events.filter(e => e.sessionId === sessionId);
    if (!sessionEvents.length) return null;

    const featuresUsed = [
      ...new Set(sessionEvents.map(e => e.event as string)),
    ];
    const funnelStagesReached = FUNNEL_STAGES.filter(s =>
      sessionEvents.some(e => e.event === s)
    );
    const times = sessionEvents.map(e => new Date(e.timestamp).getTime());
    const durationMs = times.length > 1 ? Math.max(...times) - Math.min(...times) : 0;

    return {
      sessionId,
      eventsCount: sessionEvents.length,
      featuresUsed,
      funnelStagesReached,
      durationMs,
      startTime: sessionEvents[0]?.timestamp ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── React Hook ───────────────────────────────────────────────────────────────

import { useCallback } from 'react';

export function useAnalytics() {
  const trackEvent = useCallback(
    (event: FeatureEvent | FunnelStage | string, properties?: Record<string, string | number | boolean | null>) => {
      track({ event, properties });
    },
    []
  );

  const trackFunnelStage = useCallback(
    (stage: FunnelStage, properties?: Record<string, string | number | boolean | null>) => {
      trackFunnel(stage, properties);
    },
    []
  );

  const trackFeatureUse = useCallback(
    (feature: FeatureEvent, properties?: Record<string, string | number | boolean | null>) => {
      trackFeature(feature, properties);
    },
    []
  );

  return { trackEvent, trackFunnelStage, trackFeatureUse, getSessionSummary };
}
