'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { PauseCircle, PlayCircle, Clock, CheckCircle2, XCircle, AlertTriangle, Info, Loader2, ChevronDown, ChevronUp, Shield, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type PauseStatus = 'active' | 'resumed' | 'expired' | 'cancelled';

interface Subscription {
  id: string;
  plan_name: string;
  status: string;
  current_period_end: string;
  credits_remaining: number;
  credits_total: number;
}

interface PauseRecord {
  id: string;
  subscription_id: string;
  pause_months: number;
  pause_reason: string | null;
  paused_at: string;
  resume_at: string;
  resumed_at: string | null;
  status: PauseStatus;
  initiated_by: string;
  admin_note: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PauseStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:    { label: 'Paused',   color: 'text-amber-700',   bg: 'bg-amber-50 dark:bg-amber-900/20',    icon: <PauseCircle size={12} className="text-amber-500" /> },
  resumed:   { label: 'Resumed',  color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: <PlayCircle size={12} className="text-emerald-500" /> },
  expired:   { label: 'Expired',  color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800',      icon: <Clock size={12} className="text-slate-400" /> },
  cancelled: { label: 'Cancelled',color: 'text-red-700',     bg: 'bg-red-50 dark:bg-red-900/20',        icon: <XCircle size={12} className="text-red-500" /> },
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_SUB: Subscription = {
  id: 'sub-mock-1',
  plan_name: 'Growth',
  status: 'active',
  current_period_end: new Date(Date.now() + 86400000 * 18).toISOString(),
  credits_remaining: 210,
  credits_total: 350,
};

const MOCK_PAUSES: PauseRecord[] = [
  {
    id: 'p1',
    subscription_id: 'sub-mock-1',
    pause_months: 2,
    pause_reason: 'Travelling for 2 months, will not need the service',
    paused_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    resume_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    resumed_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'resumed',
    initiated_by: 'user',
    admin_note: null,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubscriptionPauseContent() {
  const supabase = createClient();
  const { user } = useAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [pauses, setPauses] = useState<PauseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePause, setActivePause] = useState<PauseRecord | null>(null);

  // Form
  const [pauseMonths, setPauseMonths] = useState(1);
  const [pauseReason, setPauseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setSubscription(MOCK_SUB);
        setPauses(MOCK_PAUSES);
        setActivePause(null);
        return;
      }

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('id, plan_name, status, current_period_end, credits_remaining, credits_total')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      const sub = subData as Subscription | null;
      setSubscription(sub || MOCK_SUB);

      if (sub) {
        const { data: pauseData } = await supabase
          .from('subscription_pauses')
          .select('*')
          .eq('subscription_id', sub.id)
          .order('created_at', { ascending: false });

        const records = (pauseData as PauseRecord[]) || [];
        setPauses(records);
        setActivePause(records.find(p => p.status === 'active') || null);
      } else {
        setPauses(MOCK_PAUSES);
        setActivePause(null);
      }
    } catch {
      setSubscription(MOCK_SUB);
      setPauses(MOCK_PAUSES);
      setActivePause(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Pause subscription ────────────────────────────────────────────────────
  const handlePause = async () => {
    if (!subscription) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const resumeAt = addMonths(new Date(), pauseMonths);
      const { error } = await supabase.from('subscription_pauses').insert({
        subscription_id: subscription.id,
        user_id: user?.id,
        pause_months: pauseMonths,
        pause_reason: pauseReason || null,
        paused_at: new Date().toISOString(),
        resume_at: resumeAt.toISOString(),
        status: 'active',
        initiated_by: 'user',
      });

      if (error) throw new Error(error.message);

      setMsg({ type: 'success', text: `Your subscription is paused for ${pauseMonths} month${pauseMonths > 1 ? 's' : ''}. It will automatically resume on ${fmtDate(resumeAt.toISOString())}.` });
      setPauseReason('');
      setShowConfirm(false);
      loadData();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to pause subscription.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Resume early ──────────────────────────────────────────────────────────
  const handleResume = async () => {
    if (!activePause) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from('subscription_pauses')
        .update({ status: 'resumed', resumed_at: new Date().toISOString() })
        .eq('id', activePause.id);

      if (error) throw new Error(error.message);
      setMsg({ type: 'success', text: 'Your subscription has been resumed. Billing will continue from your next renewal date.' });
      loadData();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to resume subscription.' });
    } finally {
      setSubmitting(false);
    }
  };

  const resumeDate = pauseMonths ? addMonths(new Date(), pauseMonths) : null;
  const canPause = subscription && !activePause && subscription.status === 'active';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/40">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading subscription…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <PauseCircle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-700 text-white leading-tight">Pause Subscription</h1>
            <p className="text-[12px] text-white/40">Take a break for up to 3 months — your data stays safe</p>
          </div>
        </div>
      </div>

      {/* Active pause banner */}
      {activePause && (
        <div className="mb-5 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <PauseCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[14px] font-700 text-amber-300 mb-1">Subscription is currently paused</p>
              <p className="text-[12.5px] text-amber-200/70 mb-3">
                Paused for <strong>{activePause.pause_months} month{activePause.pause_months > 1 ? 's' : ''}</strong> — resumes automatically on <strong>{fmtDate(activePause.resume_at)}</strong>
                {daysUntil(activePause.resume_at) > 0 && <span className="ml-1 text-amber-200/50">({daysUntil(activePause.resume_at)} days remaining)</span>}
              </p>
              {activePause.pause_reason && (
                <p className="text-[12px] text-amber-200/50 mb-3 italic">"{activePause.pause_reason}"</p>
              )}
              <div className="flex flex-wrap gap-3 text-[12px] text-amber-200/60 mb-4">
                <span><span className="text-amber-200/40">Paused on: </span>{fmtDate(activePause.paused_at)}</span>
                <span><span className="text-amber-200/40">Resumes: </span>{fmtDate(activePause.resume_at)}</span>
              </div>
              <button
                onClick={handleResume}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-600 text-[12.5px] transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />}
                Resume Early
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current subscription card */}
      {subscription && (
        <div className="mb-5 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-[13px] font-700 text-white/70 mb-3">Current Subscription</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-white/30 mb-0.5">Plan</p>
              <p className="text-[14px] font-700 text-white">{subscription.plan_name}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/30 mb-0.5">Status</p>
              <span className={`inline-flex items-center gap-1 text-[12px] font-600 ${activePause ? 'text-amber-400' : 'text-emerald-400'}`}>
                {activePause ? <PauseCircle size={12} /> : <CheckCircle2 size={12} />}
                {activePause ? 'Paused' : 'Active'}
              </span>
            </div>
            <div>
              <p className="text-[11px] text-white/30 mb-0.5">Next Renewal</p>
              <p className="text-[13px] font-600 text-white/80">{fmtDate(subscription.current_period_end)}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/30 mb-0.5">Credits</p>
              <p className="text-[13px] font-600 text-white/80">{subscription.credits_remaining} / {subscription.credits_total}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pause form */}
      {canPause && (
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 mb-5">
          <h2 className="text-[14px] font-700 text-white mb-4">Pause Your Subscription</h2>

          {/* Duration selector */}
          <div className="mb-4">
            <label className="block text-[11px] font-600 text-white/40 mb-2 uppercase tracking-wide">Pause Duration</label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(m => (
                <button
                  key={m}
                  onClick={() => setPauseMonths(m)}
                  className={`py-3 rounded-xl border text-center transition-all ${pauseMonths === m ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70'}`}
                >
                  <p className="text-[18px] font-700">{m}</p>
                  <p className="text-[11px] font-500">month{m > 1 ? 's' : ''}</p>
                  {resumeDate && pauseMonths === m && (
                    <p className="text-[10px] text-amber-300/60 mt-0.5">Resumes {fmtDate(addMonths(new Date(), m).toISOString())}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <label className="block text-[11px] font-600 text-white/40 mb-1.5 uppercase tracking-wide">Reason (optional)</label>
            <textarea
              value={pauseReason}
              onChange={e => setPauseReason(e.target.value)}
              placeholder="Tell us why you're pausing (helps us improve)"
              rows={2}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          {/* What happens */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-4">
            <p className="text-[12px] font-600 text-white/60 mb-2">What happens when you pause:</p>
            <ul className="space-y-1.5 text-[12px] text-white/45">
              <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-500 shrink-0" />No charges during the pause period</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-500 shrink-0" />All your data, credits, and settings are retained</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-500 shrink-0" />Subscription resumes automatically at next renewal date</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-500 shrink-0" />You can resume early at any time</li>
              <li className="flex items-center gap-2"><AlertTriangle size={11} className="text-amber-500 shrink-0" />AI features will be unavailable during the pause</li>
            </ul>
          </div>

          {msg && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-[12.5px] mb-4 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
              {msg.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
              {msg.text}
            </div>
          )}

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-700 text-[13.5px] hover:from-amber-500 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <PauseCircle size={15} />
              Pause for {pauseMonths} Month{pauseMonths > 1 ? 's' : ''}
            </button>
          ) : (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-[13px] font-700 text-amber-300 mb-1">Confirm Pause</p>
              <p className="text-[12px] text-amber-200/60 mb-4">
                Your subscription will be paused for <strong>{pauseMonths} month{pauseMonths > 1 ? 's' : ''}</strong> starting today.
                It will resume automatically on <strong>{resumeDate ? fmtDate(resumeDate.toISOString()) : '—'}</strong>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handlePause}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-700 text-[13px] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <PauseCircle size={13} />}
                  Confirm Pause
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/60 font-600 text-[13px] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No subscription */}
      {!subscription && (
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-8 text-center mb-5">
          <Zap size={28} className="mx-auto mb-3 text-white/20" />
          <p className="text-[14px] font-600 text-white/50 mb-1">No active subscription</p>
          <p className="text-[12px] text-white/30">You need an active subscription to use the pause feature.</p>
        </div>
      )}

      {/* Pause history */}
      {pauses.length > 0 && (
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
          >
            <span className="text-[13px] font-700 text-white/70">Pause History ({pauses.length})</span>
            {showHistory ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
          </button>
          {showHistory && (
            <div className="border-t border-white/[0.06]">
              {pauses.map(p => {
                const sc = STATUS_CONFIG[p.status];
                return (
                  <div key={p.id} className="px-5 py-4 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-600 ${sc.bg} ${sc.color}`}>
                            {sc.icon}{sc.label}
                          </span>
                          <span className="text-[12px] text-white/50">{p.pause_months} month{p.pause_months > 1 ? 's' : ''}</span>
                          {p.initiated_by === 'admin' && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full">
                              <Shield size={9} />Admin
                            </span>
                          )}
                        </div>
                        {p.pause_reason && <p className="text-[12px] text-white/40 italic mb-1">"{p.pause_reason}"</p>}
                        <div className="flex flex-wrap gap-3 text-[11.5px] text-white/30">
                          <span>Paused: {fmtDate(p.paused_at)}</span>
                          <span>Resume: {fmtDate(p.resume_at)}</span>
                          {p.resumed_at && <span>Resumed early: {fmtDate(p.resumed_at)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="mt-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={13} className="text-teal-400" />
          <p className="text-[12.5px] font-600 text-white/60">Pause Policy</p>
        </div>
        <ul className="space-y-1 text-[12px] text-white/35">
          <li>• Maximum pause duration is 3 months per request</li>
          <li>• Only one active pause allowed at a time</li>
          <li>• Subscription resumes at the next billing cycle after the pause ends</li>
          <li>• Unused credits are preserved and available upon resumption</li>
          <li>• Pausing does not affect your plan tier or data retention</li>
        </ul>
      </div>
    </div>
  );
}
