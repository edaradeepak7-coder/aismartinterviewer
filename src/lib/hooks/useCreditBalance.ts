'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Credit costs per operation ──────────────────────────────────────────────
export const CREDIT_COSTS = {
  aiInterview: 5,
  codingAssessment: 2,
  resumeAnalysis: 1,
  resumeBuilder: 1,
  atsScoring: 1,
  mockInterview20: 3,
  mockInterview30: 5,
  mockInterview45: 7,
  mockInterview60: 10,
  premiumAssessment: 2,
  lsrwSession: 1,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;

export const OPERATION_LABELS: Record<CreditOperation, string> = {
  aiInterview: 'AI Interview',
  codingAssessment: 'Coding Assessment',
  resumeAnalysis: 'Resume Analysis',
  resumeBuilder: 'AI Resume Builder',
  atsScoring: 'ATS Score Check',
  mockInterview20: 'Mock Interview (20 min)',
  mockInterview30: 'Mock Interview (30 min)',
  mockInterview45: 'Mock Interview (45 min)',
  mockInterview60: 'Mock Interview (60 min)',
  premiumAssessment: 'Premium Assessment',
  lsrwSession: 'LSRW Practice Session',
};

export const INTERVIEW_DURATION_OPERATIONS: Record<20 | 30 | 45 | 60, CreditOperation> = {
  20: 'mockInterview20',
  30: 'mockInterview30',
  45: 'mockInterview45',
  60: 'mockInterview60',
};

// Default plan values used as fallback
const DEFAULT_TOTAL = 50_000;
const DEFAULT_REMAINING = 50_000;

export interface CreditBalance {
  remaining: number;
  total: number;
  used: number;
  usagePct: number;
  loading: boolean;
}

export function useCreditBalance() {
  const [balance, setBalance] = useState<CreditBalance>({
    remaining: DEFAULT_REMAINING,
    total: DEFAULT_TOTAL,
    used: 0,
    usagePct: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchBalance() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setBalance({ remaining: DEFAULT_REMAINING, total: DEFAULT_TOTAL, used: 0, usagePct: 0, loading: false });
          }
          return;
        }

        // Fetch subscription data from API endpoint
        const res = await fetch('/api/subscription');
        if (!res.ok) throw new Error('Subscription fetch failed');

        const json = await res.json();
        const sub = json?.data?.subscription;

        if (sub && typeof sub.credits_remaining === 'number' && typeof sub.credits_total === 'number') {
          const remaining = sub.credits_remaining;
          const total = sub.credits_total;
          const used = total - remaining;
          const usagePct = total > 0 ? Math.round((used / total) * 100) : 0;
          if (!cancelled) setBalance({ remaining, total, used, usagePct, loading: false });
        } else {
          // Fallback: derive from interview count (each interview costs 5 credits)
          const { count } = await supabase
            .from('interviews')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'completed');

          const used = (count ?? 0) * 5;
          const total = DEFAULT_TOTAL;
          const remaining = Math.max(0, total - used);
          const usagePct = Math.round((used / total) * 100);
          if (!cancelled) setBalance({ remaining, total, used, usagePct, loading: false });
        }
      } catch {
        if (!cancelled) {
          setBalance({ remaining: DEFAULT_REMAINING, total: DEFAULT_TOTAL, used: 0, usagePct: 0, loading: false });
        }
      }
    }

    fetchBalance();
    return () => { cancelled = true; };
  }, []);

  const canAfford = useCallback(
    (operation: CreditOperation) => balance.remaining >= CREDIT_COSTS[operation],
    [balance.remaining]
  );

  const getCost = useCallback((operation: CreditOperation) => CREDIT_COSTS[operation], []);

  return { balance, canAfford, getCost };
}
