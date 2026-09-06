'use client';

/**
 * Unified Integration Service
 * Wires Google Analytics, Mixpanel, Brevo drip campaigns, and custom analytics
 * across all application modules.
 */

// ─── Google Analytics ─────────────────────────────────────────────────────────

export function trackGA(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}

// ─── Mixpanel (loaded via GTM or script tag) ──────────────────────────────────

export function trackMixpanel(eventName: string, properties: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && (window as any).mixpanel) {
    (window as any).mixpanel.track(eventName, {
      ...properties,
      platform: 'ai_interviewer',
      timestamp: new Date().toISOString(),
    });
  }
}

export function identifyMixpanelUser(userId: string, traits: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && (window as any).mixpanel) {
    (window as any).mixpanel.identify(userId);
    (window as any).mixpanel.people.set({
      $distinct_id: userId,
      ...traits,
    });
  }
}

// ─── Brevo Drip Campaigns ─────────────────────────────────────────────────────

export async function triggerBrevoDrip(
  type: 'trial_drip' | 'upgrade_nudge' | 'weekly_digest' | 'reengagement',
  email: string,
  name?: string,
  extras?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch('/api/brevo/drip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, email, name, ...extras }),
    });
  } catch {
    // Non-blocking
  }
}

// ─── Unified Track (fires GA + Mixpanel + dataLayer) ─────────────────────────

export function trackAll(
  eventName: string,
  properties: Record<string, unknown> = {}
) {
  // Google Analytics
  trackGA(eventName, properties);
  // Mixpanel
  trackMixpanel(eventName, properties);
  // GTM dataLayer
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({ event: eventName, ...properties });
  }
}

// ─── Module-specific tracking helpers ────────────────────────────────────────

/** Track candidate signup */
export function trackCandidateSignup(userId: string, email: string, role: string) {
  trackAll('candidate_signup', { user_id: userId, email, role });
  identifyMixpanelUser(userId, { email, role, signup_date: new Date().toISOString() });
}

/** Track interview start */
export function trackInterviewStart(interviewId: string, type: string, userId?: string) {
  trackAll('interview_start', { interview_id: interviewId, interview_type: type, user_id: userId });
}

/** Track interview completion */
export function trackInterviewComplete(interviewId: string, score: number, userId?: string) {
  trackAll('interview_complete', { interview_id: interviewId, score, user_id: userId });
}

/** Track plan upgrade */
export function trackPlanUpgrade(plan: string, amount: number, provider: string, userId?: string) {
  trackAll('plan_upgrade', { plan, amount, provider, user_id: userId });
}

/** Track seat purchase */
export function trackSeatPurchase(seats: number, amount: number, method: string, institutionId?: string) {
  trackAll('seat_purchase', { seats, amount, payment_method: method, institution_id: institutionId });
}

/** Track content publish (Super Admin) */
export function trackContentPublish(contentType: string, contentId: string) {
  trackAll('content_published', { content_type: contentType, content_id: contentId });
}

/** Track assessment completion */
export function trackAssessmentComplete(assessmentId: string, score: number, passed: boolean) {
  trackAll('assessment_complete', { assessment_id: assessmentId, score, passed });
}

/** Track Calendly booking */
export function trackCalendlyBooking(eventType: string, userId?: string) {
  trackAll('calendly_booking', { event_type: eventType, user_id: userId });
}

/** Track ElevenLabs TTS usage */
export function trackTTSUsage(characters: number, voice?: string) {
  trackAll('tts_usage', { characters, voice });
}

/** Track Razorpay payment */
export function trackRazorpayPayment(orderId: string, amount: number, status: 'initiated' | 'success' | 'failed') {
  trackAll('razorpay_payment', { order_id: orderId, amount, status });
}

/** Track Airtable sync */
export function trackAirtableSync(operation: string, records: number) {
  trackAll('airtable_sync', { operation, records });
}
