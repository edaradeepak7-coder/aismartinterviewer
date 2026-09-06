'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Zap, Crown, Sparkles, Star, Building2, ChevronRight, ArrowRight, BadgeCheck, AlertCircle, Coins, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PricingFeature {
  id: string;
  text: string;
  included: boolean;
}

interface PricingTier {
  id: string;
  name: string;
  description: string;
  cost_per_seat: number;
  seat_minimum: number;
  seat_maximum: number | null;
  billing_period: string;
  features: PricingFeature[];
  is_published: boolean;
  is_popular: boolean;
  tier_order: number;
  badge_label: string;
  cta_label: string;
  target_audience: string;
}

// ─── Credit Consumption Rules ─────────────────────────────────────────────────
const CREDIT_RULES = [
  { action: '20-min mock interview', credits: 10, icon: '🎤' },
  { action: '30-min mock interview', credits: 15, icon: '🎤' },
  { action: '45-min mock interview', credits: 22, icon: '🎤' },
  { action: '60-min mock interview', credits: 30, icon: '🎤' },
  { action: 'Voice interview add-on (ElevenLabs TTS)', credits: 5, icon: '🔊', note: 'per session, on top of base' },
  { action: 'LSRW session (Listening/Speaking/Reading/Writing)', credits: 8, icon: '📚' },
  { action: 'Coding assessment', credits: 5, icon: '💻' },
  { action: 'Resume ATS check', credits: 3, icon: '📄' },
  { action: 'AI coaching / Q&A interaction', credits: 2, icon: '🤖' },
  { action: 'Company pack redemption', credits: 50, icon: '🏢' },
];

// ─── Fallback Tiers with strict credit counts ─────────────────────────────────
const FALLBACK_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Try AI interview practice — no card required.',
    cost_per_seat: 0,
    seat_minimum: 1,
    seat_maximum: 1,
    billing_period: 'monthly',
    is_published: true,
    is_popular: false,
    tier_order: 0,
    badge_label: '',
    cta_label: 'Start Free',
    target_audience: 'First-time users',
    features: [
      { id: 'f0', text: '30 credits/month (3 × 20-min mock interviews @ 10 credits each)', included: true },
      { id: 'f1', text: '3 AI mock interviews/month (20-min, 10 credits each)', included: true },
      { id: 'f2', text: '5 voice minutes (ElevenLabs TTS) — +5 credits/session', included: true },
      { id: 'f3', text: '2 AI coaching interactions (2 credits each)', included: true },
      { id: 'f4', text: 'Basic Communication score', included: true },
      { id: 'f5', text: 'Interview history (last 5)', included: true },
      { id: 'f6', text: 'Community support', included: true },
      { id: 'f7', text: 'Resume ATS check', included: false },
      { id: 'f8', text: 'Company prep packs', included: false },
      { id: 'f9', text: 'LSRW sessions', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Full AI coaching for serious candidates. ~$175/mo infra reserve.',
    cost_per_seat: 499,
    seat_minimum: 1,
    seat_maximum: 1,
    billing_period: 'monthly',
    is_published: true,
    is_popular: false,
    tier_order: 1,
    badge_label: '',
    cta_label: 'Get Started',
    target_audience: 'Individual candidates',
    features: [
      { id: 'f0', text: '100 credits/month — covers exactly 10 sessions', included: true },
      { id: 'f1', text: '10 × 20-min mock interviews (10 credits each)', included: true },
      { id: 'f2', text: '30 voice minutes/month (ElevenLabs TTS/STT)', included: true },
      { id: 'f3', text: '10 AI coaching interactions (2 credits each)', included: true },
      { id: 'f4', text: '5 Resume ATS checks (3 credits each = 15 credits)', included: true },
      { id: 'f5', text: '500 emails/month (Brevo transactional)', included: true },
      { id: 'f6', text: '5 GB storage', included: true },
      { id: 'f7', text: '1 Airtable integration, 1 Calendly connection', included: true },
      { id: 'f8', text: 'Communication + Clarity + Domain scores', included: true },
      { id: 'f9', text: 'Answer improvement suggestions', included: true },
      { id: 'f10', text: 'Email support (48h SLA)', included: true },
      { id: 'f11', text: 'Overage: ₹5/credit (buy extra credits anytime)', included: true },
      { id: 'f12', text: 'Company-specific prep packs (50 credits each)', included: false },
      { id: 'f13', text: 'Live recruiter interview access', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Serious prep with analytics & coaching. ~$350/mo infra reserve.',
    cost_per_seat: 1499,
    seat_minimum: 1,
    seat_maximum: null,
    billing_period: 'monthly',
    is_published: true,
    is_popular: true,
    tier_order: 2,
    badge_label: 'Most Popular',
    cta_label: 'Start Free Trial',
    target_audience: 'Active job seekers',
    features: [
      { id: 'f0', text: '350 credits/month — covers exactly 35 sessions', included: true },
      { id: 'f1', text: '23 × 20-min mock interviews (10 credits each = 230 credits)', included: true },
      { id: 'f2', text: '4 × 30-min mock interviews (15 credits each = 60 credits)', included: true },
      { id: 'f3', text: '5 LSRW sessions (8 credits each = 40 credits)', included: true },
      { id: 'f4', text: '10 AI coaching interactions (2 credits each = 20 credits)', included: true },
      { id: 'f5', text: '300 voice minutes/month (ElevenLabs TTS/STT)', included: true },
      { id: 'f6', text: '5,000 emails/month (Brevo transactional + marketing)', included: true },
      { id: 'f7', text: 'Unlimited Resume ATS checks (3 credits each)', included: true },
      { id: 'f8', text: '25 GB storage', included: true },
      { id: 'f9', text: 'Multiple Airtable + Calendly integrations', included: true },
      { id: 'f10', text: 'Full per-answer AI coaching + model answer library', included: true },
      { id: 'f11', text: 'Company-specific prep packs (50 credits each)', included: true },
      { id: 'f12', text: 'Progress analytics dashboard', included: true },
      { id: 'f13', text: 'Priority support (12h SLA)', included: true },
      { id: 'f14', text: 'Overage: ₹4/credit (buy extra credits anytime)', included: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Maximum prep power for placement-focused candidates. ~$600/mo infra reserve.',
    cost_per_seat: 3499,
    seat_minimum: 1,
    seat_maximum: null,
    billing_period: 'monthly',
    is_published: true,
    is_popular: false,
    tier_order: 3,
    badge_label: 'Best Value',
    cta_label: 'Go Pro',
    target_audience: 'Placement-focused candidates & teams',
    features: [
      { id: 'f0', text: '1,000 credits/month — covers exactly 100 sessions', included: true },
      { id: 'f1', text: '40 × 20-min mock interviews (10 credits each = 400 credits)', included: true },
      { id: 'f2', text: '20 × 30-min mock interviews (15 credits each = 300 credits)', included: true },
      { id: 'f3', text: '10 × 45-min mock interviews (22 credits each = 220 credits)', included: true },
      { id: 'f4', text: '10 LSRW sessions (8 credits each = 80 credits)', included: true },
      { id: 'f5', text: '1,000+ voice minutes/month (ElevenLabs TTS/STT)', included: true },
      { id: 'f6', text: '25,000+ emails/month (Brevo transactional + campaigns)', included: true },
      { id: 'f7', text: '100 GB storage', included: true },
      { id: 'f8', text: 'Unlimited Resume ATS checks (3 credits each)', included: true },
      { id: 'f9', text: 'Unlimited Airtable + Calendly integrations', included: true },
      { id: 'f10', text: 'Bulk candidate import & placement drive management', included: true },
      { id: 'f11', text: 'Dedicated success manager', included: true },
      { id: 'f12', text: 'Custom interview scenarios + question banks', included: true },
      { id: 'f13', text: 'Certificate of completion', included: true },
      { id: 'f14', text: 'SLA 99.9% uptime guarantee', included: true },
      { id: 'f15', text: 'Priority phone support (1h SLA)', included: true },
      { id: 'f16', text: 'Overage: ₹3/credit (buy extra credits anytime)', included: true },
    ],
  },
];

const TIER_STYLES: Record<string, { icon: React.ReactNode; gradient: string; border: string; badge: string; cta: string; creditBg: string }> = {
  free: {
    icon: <Star size={22} className="text-slate-500" />,
    gradient: 'from-slate-50 to-white',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    cta: 'bg-slate-700 hover:bg-slate-800 text-white',
    creditBg: 'bg-slate-50 border-slate-200',
  },
  starter: {
    icon: <Zap size={22} className="text-blue-600" />,
    gradient: 'from-blue-50 to-white',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    cta: 'bg-blue-600 hover:bg-blue-700 text-white',
    creditBg: 'bg-blue-50 border-blue-200',
  },
  growth: {
    icon: <Sparkles size={22} className="text-violet-600" />,
    gradient: 'from-violet-50 to-white',
    border: 'border-violet-300',
    badge: 'bg-violet-100 text-violet-700',
    cta: 'bg-violet-600 hover:bg-violet-700 text-white',
    creditBg: 'bg-violet-50 border-violet-200',
  },
  pro: {
    icon: <Crown size={22} className="text-amber-600" />,
    gradient: 'from-amber-50 to-white',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-700',
    cta: 'bg-amber-600 hover:bg-amber-700 text-white',
    creditBg: 'bg-amber-50 border-amber-200',
  },
};

function getStyle(tierId: string) {
  return TIER_STYLES[tierId] || {
    icon: <Star size={22} className="text-gray-500" />,
    gradient: 'from-gray-50 to-white',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-600',
    cta: 'bg-gray-700 hover:bg-gray-800 text-white',
    creditBg: 'bg-gray-50 border-gray-200',
  };
}

// Credit counts per plan
const PLAN_CREDITS: Record<string, { total: number; sessions: string; overage: string }> = {
  free: { total: 30, sessions: '3 sessions', overage: 'Upgrade required' },
  starter: { total: 100, sessions: '10 sessions', overage: '₹5/credit' },
  growth: { total: 350, sessions: '35 sessions', overage: '₹4/credit' },
  pro: { total: 1000, sessions: '100 sessions', overage: '₹3/credit' },
};

export default function PublicPricingContent() {
  const [tiers, setTiers] = useState<PricingTier[]>(FALLBACK_TIERS);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreditTable, setShowCreditTable] = useState(false);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('is_published', true)
        .order('tier_order');
      if (!error && data && data.length > 0) {
        setTiers(data.map((t: any) => ({
          ...t,
          features: typeof t.features === 'string' ? JSON.parse(t.features) : t.features,
        })));
      }
    } catch {
      // Use fallback
    } finally {
      setIsLoading(false);
    }
  };

  const getPrice = (tier: PricingTier) => {
    const base = tier.cost_per_seat;
    return billing === 'annual' ? Math.round(base * 0.8) : base;
  };

  const publishedTiers = tiers.filter(t => t.is_published).slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#F0F4FF]">
      {/* Hero */}
      <div className="text-center pt-16 pb-10 px-4">
        <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-4 py-1.5 mb-6">
          <BadgeCheck size={14} className="text-[#0D9488]" />
          <span className="text-xs font-700 text-[#0D9488]">Transparent credit-based pricing — pay only for what you use</span>
        </div>
        <h1 className="text-4xl font-900 text-[#0D1B3E] mb-4 leading-tight">
          Invest in your career.<br />
          <span className="text-[#0D9488]">Every credit counts.</span>
        </h1>
        <p className="text-lg text-[#6B7A99] max-w-2xl mx-auto mb-4">
          Each plan comes with a fixed monthly credit allowance. Credits are consumed strictly per action — no hidden charges, no vague limits.
        </p>

        {/* Credit Rules CTA */}
        <button
          onClick={() => setShowCreditTable(!showCreditTable)}
          className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 mb-4 hover:bg-indigo-100 transition-colors"
        >
          <Coins size={14} className="text-indigo-600" />
          <span className="text-xs font-600 text-indigo-700">View credit consumption rules</span>
          <ChevronRight size={12} className={`text-indigo-500 transition-transform ${showCreditTable ? 'rotate-90' : ''}`} />
        </button>

        {/* Credit Consumption Table */}
        {showCreditTable && (
          <div className="max-w-2xl mx-auto mb-6 bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-indigo-600" />
                <span className="text-sm font-700 text-indigo-800">Credit Consumption Rules</span>
              </div>
              <button onClick={() => setShowCreditTable(false)} className="text-indigo-400 hover:text-indigo-600">
                <X size={14} />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {CREDIT_RULES.map((rule, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2 text-left">
                    <span className="text-base">{rule.icon}</span>
                    <div>
                      <span className="text-sm text-[#0D1B3E] font-500">{rule.action}</span>
                      {rule.note && <span className="text-xs text-slate-400 ml-1">({rule.note})</span>}
                    </div>
                  </div>
                  <span className="text-sm font-700 text-indigo-700 whitespace-nowrap ml-4">{rule.credits} credits</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
              <p className="text-xs text-amber-700">
                <strong>Example:</strong> A 30-min voice interview = 15 credits (session) + 5 credits (voice add-on) = <strong>20 credits total</strong>
              </p>
            </div>
          </div>
        )}

        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-8">
          <AlertCircle size={14} className="text-amber-600" />
          <span className="text-xs text-amber-700 font-600">Pricing reflects real infrastructure costs: AI APIs, ElevenLabs voice, Supabase, Railway, Brevo, Airtable, Calendly, and Razorpay.</span>
        </div>

        {/* Billing Toggle */}
        <div className="inline-flex items-center bg-[#F4F6FA] rounded-2xl p-1.5 gap-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-xl text-sm font-700 transition-all ${billing === 'monthly' ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99]'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-5 py-2 rounded-xl text-sm font-700 transition-all flex items-center gap-2 ${billing === 'annual' ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99]'}`}
          >
            Annual
            <span className="text-[10px] font-800 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {publishedTiers.map((tier) => {
            const style = getStyle(tier.id);
            const price = getPrice(tier);
            const isPopular = tier.is_popular;
            const creditInfo = PLAN_CREDITS[tier.id] || { total: 0, sessions: '—', overage: '—' };

            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border-2 bg-gradient-to-b ${style.gradient} ${style.border} p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow ${isPopular ? 'ring-2 ring-violet-400 ring-offset-2' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-violet-600 text-white text-xs font-700 px-3 py-1 rounded-full shadow">Most Popular</span>
                  </div>
                )}
                {tier.badge_label && !isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-xs font-700 px-3 py-1 rounded-full shadow ${style.badge}`}>{tier.badge_label}</span>
                  </div>
                )}

                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {style.icon}
                    <span className="font-800 text-[#0D1B3E] text-lg">{tier.name}</span>
                  </div>
                  <p className="text-xs text-[#6B7A99] leading-relaxed">{tier.description}</p>
                </div>

                {/* Price */}
                <div>
                  {price === 0 ? (
                    <div className="text-3xl font-900 text-[#0D1B3E]">Free</div>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-900 text-[#0D1B3E]">₹{price.toLocaleString('en-IN')}</span>
                      <span className="text-sm text-[#6B7A99] mb-1">/mo</span>
                    </div>
                  )}
                  {billing === 'annual' && price > 0 && (
                    <p className="text-xs text-emerald-600 font-600 mt-0.5">Billed annually (20% off)</p>
                  )}
                </div>

                {/* Credit Badge */}
                <div className={`rounded-xl border px-3 py-2.5 ${style.creditBg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Coins size={13} className="text-indigo-600" />
                      <span className="text-xs font-700 text-[#0D1B3E]">{creditInfo.total} credits/month</span>
                    </div>
                    <span className="text-xs font-600 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{creditInfo.sessions}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Overage: {creditInfo.overage}</p>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2 flex-1">
                  {tier.features.map((f) => (
                    <li key={f.id} className="flex items-start gap-2">
                      {f.included ? (
                        <Check size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <X size={13} className="text-slate-300 mt-0.5 shrink-0" />
                      )}
                      <span className={`text-xs leading-relaxed ${f.included ? 'text-[#374151]' : 'text-slate-400'}`}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={price === 0 ? '/register' : '/pricing'}
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-700 transition-all ${style.cta}`}
                >
                  {tier.cta_label}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit Breakdown Table */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-indigo-600" />
              <h2 className="text-base font-800 text-[#0D1B3E]">How credits map to sessions — plan by plan</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Every credit is consumed strictly per action. No hidden deductions.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-700 text-slate-600">Action</th>
                  <th className="text-center px-3 py-3 text-xs font-700 text-slate-600">Credits</th>
                  <th className="text-center px-3 py-3 text-xs font-700 text-slate-500">Free (30)</th>
                  <th className="text-center px-3 py-3 text-xs font-700 text-blue-600">Starter (100)</th>
                  <th className="text-center px-3 py-3 text-xs font-700 text-violet-600">Growth (350)</th>
                  <th className="text-center px-3 py-3 text-xs font-700 text-amber-600">Pro (1,000)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { action: '20-min mock interview', credits: 10, free: 3, starter: 10, growth: 23, pro: 40 },
                  { action: '30-min mock interview', credits: 15, free: 2, starter: 6, growth: 4, pro: 20 },
                  { action: '45-min mock interview', credits: 22, free: 1, starter: 4, growth: 3, pro: 10 },
                  { action: '60-min mock interview', credits: 30, free: 1, starter: 3, growth: 2, pro: 6 },
                  { action: 'Voice add-on (TTS)', credits: 5, free: '—', starter: 'per session', growth: 'per session', pro: 'per session' },
                  { action: 'LSRW session', credits: 8, free: '—', starter: '—', growth: 5, pro: 10 },
                  { action: 'Coding assessment', credits: 5, free: '—', starter: 5, growth: 10, pro: 20 },
                  { action: 'Resume ATS check', credits: 3, free: '—', starter: 5, growth: 'Unlimited', pro: 'Unlimited' },
                  { action: 'AI coaching / Q&A', credits: 2, free: 2, starter: 10, growth: 10, pro: 'Unlimited' },
                  { action: 'Company pack', credits: 50, free: '—', starter: '—', growth: 1, pro: 3 },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-5 py-2.5 text-xs text-[#374151] font-500">{row.action}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs font-700 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{row.credits}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-500">{row.free}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-blue-700 font-600">{row.starter}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-violet-700 font-600">{row.growth}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-amber-700 font-600">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-indigo-50 to-violet-50 border-t border-indigo-100">
                  <td className="px-5 py-3 text-xs font-700 text-[#0D1B3E]">Total credits/month</td>
                  <td className="px-3 py-3 text-center text-xs font-700 text-indigo-700">—</td>
                  <td className="px-3 py-3 text-center text-xs font-700 text-slate-600">30</td>
                  <td className="px-3 py-3 text-center text-xs font-700 text-blue-700">100</td>
                  <td className="px-3 py-3 text-center text-xs font-700 text-violet-700">350</td>
                  <td className="px-3 py-3 text-center text-xs font-700 text-amber-700">1,000</td>
                </tr>
                <tr className="bg-gradient-to-r from-indigo-50 to-violet-50">
                  <td className="px-5 py-3 text-xs font-700 text-[#0D1B3E]">Overage rate</td>
                  <td className="px-3 py-3 text-center text-xs text-slate-400">—</td>
                  <td className="px-3 py-3 text-center text-xs text-slate-500">Upgrade</td>
                  <td className="px-3 py-3 text-center text-xs text-blue-700 font-600">₹5/credit</td>
                  <td className="px-3 py-3 text-center text-xs text-violet-700 font-600">₹4/credit</td>
                  <td className="px-3 py-3 text-center text-xs text-amber-700 font-600">₹3/credit</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* B2B CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-r from-[#0D1B3E] to-[#1a2f5e] rounded-2xl p-8 text-center text-white">
          <Building2 size={32} className="mx-auto mb-3 text-teal-400" />
          <h2 className="text-2xl font-800 mb-2">Hiring at scale?</h2>
          <p className="text-slate-300 mb-6 text-sm max-w-lg mx-auto">
            B2B recruiter plans include session credits for candidate-facing interviews, plus AI interactions, voice minutes, and team seats.
          </p>
          <Link
            href="/b2b-pricing"
            className="inline-flex items-center gap-2 bg-[#0D9488] hover:bg-teal-600 text-white px-6 py-3 rounded-xl font-700 text-sm transition-colors"
          >
            View B2B Plans <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
