'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Copy, Check, Share2, RefreshCw, Loader2, Users } from 'lucide-react';
import { csrfHeaders } from '@/lib/api/apiClient';

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  conversionRate: number;
}

interface ReferralEntry {
  id: string;
  inviteeEmail: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  signed_up: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-gray-100 text-gray-600',
};

export default function ReferralContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    pendingReferrals: 0,
    completedReferrals: 0,
    conversionRate: 0,
  });
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/referral');
      if (res.status === 401) {
        setError('Sign in to view referrals.');
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load referrals');
        return;
      }
      setReferralCode(json.referralCode || '');
      const path = json.referralLink || `/register?ref=${json.referralCode}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setReferralLink(path.startsWith('http') ? path : `${origin}${path}`);
      setStats(
        json.stats || {
          totalReferrals: 0,
          pendingReferrals: 0,
          completedReferrals: 0,
          conversionRate: 0,
        }
      );
      setReferrals(json.referrals || []);
    } catch {
      setError('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join AI Smart Interviewer',
        text: 'Use my referral code to get started!',
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ inviteeEmail: inviteEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Invite failed');
        return;
      }
      setInviteEmail('');
      await load();
    } catch {
      setError('Invite failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B3E] flex items-center gap-2">
            <Gift size={24} className="text-teal-600" />
            Referral Program
          </h1>
          <p className="text-sm text-[#6B7A99] mt-1">
            Share your code and track invites
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 border border-[#DDE3EE] rounded-lg text-sm hover:bg-[#F4F6FA]"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-teal-600' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-teal-600" size={28} />
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-br from-teal-50 via-white to-transparent border border-teal-100 rounded-2xl p-6">
            <p className="text-sm font-medium text-[#6B7A99] mb-1">Your Referral Code</p>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="text-3xl font-bold tracking-widest text-[#0D1B3E] font-mono">
                {referralCode || '—'}
              </span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border text-xs font-700"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-700"
              >
                <Share2 size={12} /> Share
              </button>
            </div>
            <p className="text-xs text-[#6B7A99] break-all">{referralLink}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: stats.totalReferrals },
              { label: 'Pending', value: stats.pendingReferrals },
              { label: 'Completed', value: stats.completedReferrals },
              { label: 'Conversion', value: `${stats.conversionRate}%` },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4">
                <p className="text-[10px] text-[#6B7A99] uppercase font-600">{s.label}</p>
                <p className="text-xl font-800 text-[#0D1B3E] mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleInvite}
            className="bg-white border border-[#E8ECF4] rounded-2xl p-5 flex flex-col sm:flex-row gap-3"
          >
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@email.com"
              className="flex-1 border border-[#DDE3EE] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-[#0D1B3E] text-white text-sm font-700 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Track invite'}
            </button>
          </form>

          {referrals.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#DDE3EE] rounded-2xl">
              <Users size={32} className="text-[#C4CAD9] mx-auto mb-2" />
              <p className="text-sm font-600 text-[#6B7A99]">No referrals yet</p>
              <p className="text-xs text-[#6B7A99] mt-1">
                Share your link or add an invite email to start tracking.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F4F6FA] text-[10px] uppercase text-[#6B7A99]">
                    <th className="text-left px-4 py-3 font-600">Email</th>
                    <th className="text-left px-4 py-3 font-600">Status</th>
                    <th className="text-left px-4 py-3 font-600">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-t border-[#F0F3F9]">
                      <td className="px-4 py-3">{r.inviteeEmail}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-700 ${STATUS_COLORS[r.status] || STATUS_COLORS.pending}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7A99]">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
