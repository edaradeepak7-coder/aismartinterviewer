'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { PauseCircle, PlayCircle, Clock, CheckCircle2, XCircle, AlertTriangle, Info, Loader2, ChevronDown, ChevronUp, Shield, Zap } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

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

const STATUS_CONFIG: Record<PauseStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:    { label: 'Paused',   color: 'text-amber-700',   bg: 'bg-amber-50',    icon: <PauseCircle size={12} className="text-amber-500" /> },
  resumed:   { label: 'Resumed',  color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <PlayCircle size={12} className="text-emerald-500" /> },
  expired:   { label: 'Expired',  color: 'text-slate-500',   bg: 'bg-slate-100',      icon: <Clock size={12} className="text-slate-400" /> },
  cancelled: { label: 'Cancelled',color: 'text-red-700',     bg: 'bg-red-50',        icon: <XCircle size={12} className="text-red-500" /> },
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

export default function SubscriptionPauseContent() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [pauses, setPauses] = useState<PauseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePause, setActivePause] = useState<PauseRecord | null>(null);

  const [pauseMonths, setPauseMonths] = useState(1);
  const [pauseReason, setPauseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/subscription-pause');
      if (res.status === 401) {
        setSubscription(null);
        setPauses([]);
        setActivePause(null);
        setLoadError('Sign in to manage your subscription pause.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setSubscription(json.subscription || null);
      const records = (json.pauses as PauseRecord[]) || [];
      setPauses(records);
      setActivePause(json.activePause || records.find(p => p.status === 'active') || null);
    } catch {
      setSubscription(null);
      setPauses([]);
      setActivePause(null);
      setLoadError('Could not load subscription data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePause = async () => {
    if (!subscription) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const resumeAt = addMonths(new Date(), pauseMonths);
      const res = await fetch('/api/subscription-pause', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          pause_months: pauseMonths,
          pause_reason: pauseReason || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to pause subscription.');

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

  const handleResume = async () => {
    if (!activePause) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/subscription-pause', {
        method: 'PATCH',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pause_id: activePause.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to resume subscription.');
      setMsg({ type: 'success', text: 'Your subscription has been resumed. Billing will continue from your next renewal date.' });
      loadData();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to resume subscription.' });
    } finally {
      setSubmitting(false);
    }
  };

  const resumeDate = pauseMonths ? addMonths(new Date(), pauseMonths) : null;
  const canPause = subscription && !activePause && (subscription.status === 'active' || subscription.status === 'trialing');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={24} className="animate-spin text-[#0D9488]" />
        <p className="text-sm text-[#6B7A99]">Loading subscription…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <PauseCircle size={20} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-800 text-[#0D1B3E]">Pause Subscription</h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">Take a break for up to 3 months — your data stays safe</p>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 text-sm text-amber-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="shrink-0 px-3 py-1.5 text-xs font-600 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {msg && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
          {msg.text}
        </div>
      )}

      {!loadError && activePause && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <PauseCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-700 text-amber-900 mb-1">Subscription is currently paused</p>
              <p className="text-sm text-amber-800/80 mb-3">
                Paused for <strong>{activePause.pause_months} month{activePause.pause_months > 1 ? 's' : ''}</strong> — resumes automatically on <strong>{fmtDate(activePause.resume_at)}</strong>
                {daysUntil(activePause.resume_at) > 0 && <span className="ml-1 text-amber-700/60">({daysUntil(activePause.resume_at)} days remaining)</span>}
              </p>
              {activePause.pause_reason && (
                <p className="text-xs text-amber-700/70 mb-3 italic">&ldquo;{activePause.pause_reason}&rdquo;</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-amber-800/70 mb-4">
                <span><span className="text-amber-700/50">Paused on: </span>{fmtDate(activePause.paused_at)}</span>
                <span><span className="text-amber-700/50">Resumes: </span>{fmtDate(activePause.resume_at)}</span>
              </div>
              <button
                type="button"
                onClick={handleResume}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-600 text-sm transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />}
                Resume Early
              </button>
            </div>
          </div>
        </div>
      )}

      {!loadError && subscription && (
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
          <h2 className="text-sm font-700 text-[#0D1B3E] mb-3">Current Subscription</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-[#6B7A99] mb-0.5">Plan</p>
              <p className="text-sm font-700 text-[#0D1B3E]">{subscription.plan_name}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#6B7A99] mb-0.5">Status</p>
              <span className={`inline-flex items-center gap-1 text-sm font-600 ${activePause ? 'text-amber-600' : 'text-emerald-600'}`}>
                {activePause ? <PauseCircle size={12} /> : <CheckCircle2 size={12} />}
                {activePause ? 'Paused' : subscription.status === 'trialing' ? 'Trialing' : 'Active'}
              </span>
            </div>
            <div>
              <p className="text-[11px] text-[#6B7A99] mb-0.5">Next Renewal</p>
              <p className="text-sm font-600 text-[#0D1B3E]">{fmtDate(subscription.current_period_end)}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#6B7A99] mb-0.5">Credits</p>
              <p className="text-sm font-600 text-[#0D1B3E]">{subscription.credits_remaining} / {subscription.credits_total}</p>
            </div>
          </div>
        </div>
      )}

      {!loadError && canPause && (
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
          <h2 className="text-sm font-700 text-[#0D1B3E] mb-4">Pause Your Subscription</h2>

          <div className="mb-4">
            <label className="block text-[11px] font-600 text-[#6B7A99] mb-2 uppercase tracking-wide">Pause Duration</label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPauseMonths(m)}
                  className={`py-3 rounded-xl border text-center transition-all ${pauseMonths === m ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-[#E8ECF4] bg-[#F8FAFC] text-[#6B7A99] hover:border-[#DDE3EE] hover:text-[#0D1B3E]'}`}
                >
                  <p className="text-lg font-700">{m}</p>
                  <p className="text-[11px] font-500">month{m > 1 ? 's' : ''}</p>
                  {resumeDate && pauseMonths === m && (
                    <p className="text-[10px] text-amber-600/70 mt-0.5">Resumes {fmtDate(addMonths(new Date(), m).toISOString())}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-600 text-[#6B7A99] mb-1.5 uppercase tracking-wide">Reason (optional)</label>
            <textarea
              value={pauseReason}
              onChange={e => setPauseReason(e.target.value)}
              placeholder="Tell us why you're pausing (helps us improve)"
              rows={2}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF4] rounded-lg px-3 py-2.5 text-sm text-[#0D1B3E] placeholder-[#6B7A99]/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none"
            />
          </div>

          <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl p-4 mb-4">
            <p className="text-xs font-600 text-[#0D1B3E] mb-2">What happens when you pause:</p>
            <ul className="space-y-1.5 text-xs text-[#6B7A99]">
              <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-500 shrink-0" />No charges during the pause period</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-500 shrink-0" />All your data, credits, and settings are retained</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-500 shrink-0" />Subscription resumes automatically at next renewal date</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-500 shrink-0" />You can resume early at any time</li>
              <li className="flex items-center gap-2"><AlertTriangle size={11} className="text-amber-500 shrink-0" />AI features will be unavailable during the pause</li>
            </ul>
          </div>

          {!showConfirm ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-700 text-sm hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2"
            >
              <PauseCircle size={15} />
              Pause for {pauseMonths} Month{pauseMonths > 1 ? 's' : ''}
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-700 text-amber-900 mb-1">Confirm Pause</p>
              <p className="text-xs text-amber-800/80 mb-4">
                Your subscription will be paused for <strong>{pauseMonths} month{pauseMonths > 1 ? 's' : ''}</strong> starting today.
                It will resume automatically on <strong>{resumeDate ? fmtDate(resumeDate.toISOString()) : '—'}</strong>.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-700 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <PauseCircle size={13} />}
                  Confirm Pause
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg bg-[#F4F6FA] hover:bg-[#E8ECF4] text-[#6B7A99] font-600 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!loadError && !subscription && (
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-8 text-center">
          <Zap size={28} className="mx-auto mb-3 text-[#E8ECF4]" />
          <p className="text-sm font-600 text-[#0D1B3E] mb-1">No active subscription</p>
          <p className="text-xs text-[#6B7A99]">You need an active or trial subscription to use the pause feature.</p>
        </div>
      )}

      {!loadError && pauses.length > 0 && (
        <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
          >
            <span className="text-sm font-700 text-[#0D1B3E]">Pause History ({pauses.length})</span>
            {showHistory ? <ChevronUp size={14} className="text-[#6B7A99]" /> : <ChevronDown size={14} className="text-[#6B7A99]" />}
          </button>
          {showHistory && (
            <div className="border-t border-[#E8ECF4]">
              {pauses.map(p => {
                const sc = STATUS_CONFIG[p.status];
                return (
                  <div key={p.id} className="px-5 py-4 border-b border-[#F4F6FA] last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-600 ${sc.bg} ${sc.color}`}>
                            {sc.icon}{sc.label}
                          </span>
                          <span className="text-xs text-[#6B7A99]">{p.pause_months} month{p.pause_months > 1 ? 's' : ''}</span>
                          {p.initiated_by === 'admin' && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                              <Shield size={9} />Admin
                            </span>
                          )}
                        </div>
                        {p.pause_reason && <p className="text-xs text-[#6B7A99] italic mb-1">&ldquo;{p.pause_reason}&rdquo;</p>}
                        <div className="flex flex-wrap gap-3 text-[11px] text-[#6B7A99]">
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

      <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={13} className="text-[#0D9488]" />
          <p className="text-xs font-600 text-[#0D1B3E]">Pause Policy</p>
        </div>
        <ul className="space-y-1 text-xs text-[#6B7A99]">
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
