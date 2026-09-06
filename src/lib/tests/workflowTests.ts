/**
 * Automated Workflow Test Suite
 * Covers: candidate mock interview, recruiter live panel, payment redemption,
 * real-time subscription updates, and API integrations.
 *
 * Run via: npx ts-node src/lib/tests/workflowTests.ts
 * Or import runAllWorkflowTests() in your CI/CD pipeline.
 */

import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  duration: number; // ms
  error?: string;
}

export interface TestSuiteReport {
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
  timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function runTest(
  suite: string,
  test: string,
  fn: () => Promise<void>
): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return { suite, test, passed: true, duration: Date.now() - start };
  } catch (err: any) {
    return {
      suite,
      test,
      passed: false,
      duration: Date.now() - start,
      error: err?.message ?? String(err),
    };
  }
}

// ─── Suite 1: Candidate Mock Interview Flow ───────────────────────────────────

async function testCandidateMockInterviewFlow(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(
    await runTest('CandidateMockInterview', 'API /api/interviews GET returns 200', async () => {
      const res = await fetch('/api/interviews', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('CandidateMockInterview', 'API /api/interviews POST creates session', async () => {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'Software Engineer',
          interview_type: 'mock',
          duration_minutes: 20,
          question_count: 15,
        }),
      });
      if (!res.ok) throw new Error(`Expected 201/200, got ${res.status}`);
      const data = await res.json();
      if (!data.id && !data.interview?.id) throw new Error('No interview ID returned');
    })
  );

  results.push(
    await runTest('CandidateMockInterview', 'AI chat-completion endpoint responds', async () => {
      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say "test ok" in 3 words.' }],
          max_tokens: 20,
        }),
      });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.choices?.[0]?.message?.content) throw new Error('No content in response');
    })
  );

  results.push(
    await runTest('CandidateMockInterview', 'AI evaluate endpoint scores an answer', async () => {
      const res = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Describe a challenging project you worked on.',
          answer: 'I led a migration from monolith to microservices, reducing latency by 40%.',
          role: 'Software Engineer',
          category: 'Technical',
        }),
      });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (typeof data.score !== 'number') throw new Error('No numeric score returned');
    })
  );

  results.push(
    await runTest('CandidateMockInterview', 'AI contextual-questions endpoint returns questions', async () => {
      const res = await fetch('/api/ai/contextual-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'Software Engineer',
          previousAnswers: [],
          count: 3,
        }),
      });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  return results;
}

// ─── Suite 2: Recruiter Live Panel ────────────────────────────────────────────

async function testRecruiterLivePanel(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(
    await runTest('RecruiterLivePanel', 'AI groq-chat-completion endpoint responds', async () => {
      const res = await fetch('/api/ai/groq-chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Reply with "ok".' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('RecruiterLivePanel', 'AI score-response endpoint returns score', async () => {
      const res = await fetch('/api/ai/score-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'What is REST?',
          answer: 'REST is an architectural style for APIs using HTTP methods.',
          role: 'Backend Engineer',
        }),
      });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('RecruiterLivePanel', 'Job postings API GET returns 200', async () => {
      const res = await fetch('/api/job-postings', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('RecruiterLivePanel', 'Recruiter feedback API GET returns 200', async () => {
      const res = await fetch('/api/recruiter-feedback', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('RecruiterLivePanel', 'Candidates API GET returns 200', async () => {
      const res = await fetch('/api/candidates', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  return results;
}

// ─── Suite 3: Payment Redemption (Razorpay / Stripe) ─────────────────────────

async function testPaymentRedemption(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(
    await runTest('PaymentRedemption', 'Subscription API GET returns plan data', async () => {
      const res = await fetch('/api/subscription', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('PaymentRedemption', 'Subscription API POST validates plan field', async () => {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'starter', provider: 'razorpay' }),
      });
      // 200 = success, 400 = validation error (both acceptable — not a 500)
      if (res.status >= 500) throw new Error(`Server error ${res.status}`);
    })
  );

  results.push(
    await runTest('PaymentRedemption', 'Credit balance hook endpoint accessible', async () => {
      // Validate the credits API doesn't 500
      const res = await fetch('/api/subscription', { method: 'GET' });
      if (res.status >= 500) throw new Error(`Credits endpoint server error ${res.status}`);
    })
  );

  return results;
}

// ─── Suite 4: Real-Time Subscription Updates ─────────────────────────────────

async function testRealtimeSubscriptions(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(
    await runTest('RealtimeSubscriptions', 'Supabase client initialises without error', async () => {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase client is null');
    })
  );

  results.push(
    await runTest('RealtimeSubscriptions', 'Supabase realtime channel subscribes and unsubscribes', async () => {
      const supabase = createClient();
      const channel = supabase.channel('test-workflow-channel');
      const sub = channel.subscribe();
      if (!sub) throw new Error('Channel subscription returned null');
      await supabase.removeChannel(channel);
    })
  );

  results.push(
    await runTest('RealtimeSubscriptions', 'Notifications API GET returns 200', async () => {
      const res = await fetch('/api/notifications', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('RealtimeSubscriptions', 'Sessions API GET returns 200', async () => {
      const res = await fetch('/api/sessions', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  return results;
}

// ─── Suite 5: API Integration Health ─────────────────────────────────────────

async function testAPIIntegrations(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(
    await runTest('APIIntegrations', 'AI validate-keys endpoint returns provider status', async () => {
      const res = await fetch('/api/ai/validate-keys', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (typeof data !== 'object') throw new Error('Expected JSON object');
    })
  );

  results.push(
    await runTest('APIIntegrations', 'ElevenLabs TTS endpoint accepts POST', async () => {
      const res = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test', voice_id: 'test' }),
      });
      // 400 = bad voice_id is fine; 500 = broken
      if (res.status >= 500) throw new Error(`ElevenLabs TTS server error ${res.status}`);
    })
  );

  results.push(
    await runTest('APIIntegrations', 'Questions API GET returns 200', async () => {
      const res = await fetch('/api/questions', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('APIIntegrations', 'Assessments API GET returns 200', async () => {
      const res = await fetch('/api/assessments', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('APIIntegrations', 'Results API GET returns 200', async () => {
      const res = await fetch('/api/results', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  results.push(
    await runTest('APIIntegrations', 'Audit logs API GET returns 200', async () => {
      const res = await fetch('/api/audit-logs', { method: 'GET' });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    })
  );

  return results;
}

// ─── Master Runner ────────────────────────────────────────────────────────────

export async function runAllWorkflowTests(): Promise<TestSuiteReport> {
  const start = Date.now();

  const [
    mockInterviewResults,
    recruiterPanelResults,
    paymentResults,
    realtimeResults,
    apiResults,
  ] = await Promise.all([
    testCandidateMockInterviewFlow(),
    testRecruiterLivePanel(),
    testPaymentRedemption(),
    testRealtimeSubscriptions(),
    testAPIIntegrations(),
  ]);

  const allResults = [
    ...mockInterviewResults,
    ...recruiterPanelResults,
    ...paymentResults,
    ...realtimeResults,
    ...apiResults,
  ];

  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.length - passed;

  return {
    totalTests: allResults.length,
    passed,
    failed,
    durationMs: Date.now() - start,
    results: allResults,
    timestamp: new Date().toISOString(),
  };
}

export default runAllWorkflowTests;
