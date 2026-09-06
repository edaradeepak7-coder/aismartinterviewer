'use client';
import React, { useState } from 'react';
import { Check, Zap, Crown, Building2, ChevronDown, ChevronUp, Minus, Plus, Shield, BarChart3, Headphones, Globe, AlertCircle, Coins, X, Info } from 'lucide-react';
import Link from 'next/link';

interface B2BPlan {
  id: string;
  name: string;
  tagline: string;
  infraReserve: string;
  monthlyPerSeat: number;
  annualPerSeat: number;
  minSeats: number;
  maxSeats: number | null;
  // Credit allowances
  sessionCredits: number;
  aiInteractionCredits: number;
  voiceMinutes: number | 'Unlimited';
  emailsPerMonth: number | 'Unlimited';
  storage: string;
  // Overage
  overageCreditRate: string;
  overageVoice: string;
  // Style
  color: string;
  gradient: string;
  borderColor: string;
  icon: React.ReactNode;
  popular?: boolean;
  features: string[];
  seatLabel: string;
  sla: string;
  supportSla: string;
}

// ─── Credit Consumption Rules ─────────────────────────────────────────────────
const CREDIT_RULES = [
  { action: '20-min AI interview session', credits: 10, icon: '🎤' },
  { action: '30-min AI interview session', credits: 15, icon: '🎤' },
  { action: '45-min AI interview session', credits: 22, icon: '🎤' },
  { action: '60-min AI interview session', credits: 30, icon: '🎤' },
  { action: 'Voice interview add-on (ElevenLabs TTS)', credits: 5, icon: '🔊', note: 'per session, on top of base' },
  { action: 'LSRW session', credits: 8, icon: '📚' },
  { action: 'Coding assessment', credits: 5, icon: '💻' },
  { action: 'Resume ATS check', credits: 3, icon: '📄' },
  { action: 'AI evaluation / scoring', credits: 4, icon: '🤖' },
  { action: 'AI coaching / Q&A interaction', credits: 2, icon: '💬' },
  { action: 'Company pack redemption', credits: 50, icon: '🏢' },
];

const b2bPlans: B2BPlan[] = [
  {
    id: 'recruiter-starter',
    name: 'Recruiter Starter',
    tagline: 'For small teams hiring 1–10 roles/month',
    infraReserve: '~$175/mo infrastructure reserve',
    monthlyPerSeat: 2999,
    annualPerSeat: 2399,
    minSeats: 1,
    maxSeats: 5,
    sessionCredits: 500,
    aiInteractionCredits: 500,
    voiceMinutes: 30,
    emailsPerMonth: 500,
    storage: '10 GB',
    overageCreditRate: '₹5/credit',
    overageVoice: '₹2/extra voice min',
    color: 'text-sky-400',
    gradient: 'from-sky-500/20 to-cyan-500/10',
    borderColor: 'border-sky-500/40',
    icon: <Zap size={22} className="text-sky-400" />,
    seatLabel: 'recruiter seat',
    sla: '99.5% uptime',
    supportSla: '48h email',
    features: [
      '500 session credits/month — covers 50 × 20-min interviews (10 credits each)',
      '50 AI interview sessions/month (20-min @ 10 credits, 30-min @ 15 credits)',
      '30 voice minutes/month (ElevenLabs TTS/STT) — +5 credits/voice session',
      '500 emails/month (Brevo transactional)',
      '10 GB storage',
      'Up to 5 recruiter seats',
      'Candidate scoring & ranking (4 credits/evaluation)',
      'Interview question bank (500+ questions)',
      'Basic ATS integration (CSV export)',
      'Email support (48h SLA)',
      'Candidate feedback reports',
      'Job posting management',
      '1 Airtable integration, 1 Calendly connection',
      'Overage: ₹5/credit — buy extra credits anytime',
    ],
  },
  {
    id: 'recruiter-professional',
    name: 'Recruiter Professional',
    tagline: 'For scaling teams with structured pipelines',
    infraReserve: '~$350–400/mo infrastructure reserve',
    monthlyPerSeat: 7999,
    annualPerSeat: 6399,
    minSeats: 5,
    maxSeats: 25,
    sessionCredits: 2000,
    aiInteractionCredits: 2000,
    voiceMinutes: 300,
    emailsPerMonth: 5000,
    storage: '50 GB',
    overageCreditRate: '₹4/credit',
    overageVoice: '₹1.5/extra voice min',
    color: 'text-violet-400',
    gradient: 'from-violet-500/20 to-purple-500/10',
    borderColor: 'border-violet-500/40',
    icon: <BarChart3 size={22} className="text-violet-400" />,
    popular: true,
    seatLabel: 'recruiter seat',
    sla: '99.7% uptime',
    supportSla: '12h priority',
    features: [
      '2,000 session credits/month — covers 200 × 20-min interviews (10 credits each)',
      '200 AI interview sessions/month (mix of 20/30/45-min)',
      '300 voice minutes/month (ElevenLabs TTS/STT) — +5 credits/voice session',
      '5,000 emails/month (Brevo transactional + marketing)',
      '50 GB storage',
      'Up to 25 recruiter seats',
      'Advanced candidate analytics dashboard',
      'Custom competency frameworks',
      'Full ATS integration (Greenhouse, Lever, etc.)',
      'Priority support (12h SLA)',
      'Placement drive management',
      'Bulk candidate import/export',
      'Interview recording & playback',
      'Team collaboration tools',
      'Multiple Airtable + Calendly integrations',
      'Overage: ₹4/credit — buy extra credits anytime',
    ],
  },
  {
    id: 'recruiter-business',
    name: 'Business',
    tagline: 'For large orgs with compliance & custom needs',
    infraReserve: '~$600/mo infrastructure reserve',
    monthlyPerSeat: 19999,
    annualPerSeat: 15999,
    minSeats: 25,
    maxSeats: null,
    sessionCredits: 10000,
    aiInteractionCredits: 10000,
    voiceMinutes: 1000,
    emailsPerMonth: 25000,
    storage: '200 GB',
    overageCreditRate: '₹3/credit',
    overageVoice: '₹1/extra voice min',
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/40',
    icon: <Crown size={22} className="text-amber-400" />,
    seatLabel: 'recruiter seat',
    sla: '99.9% uptime SLA',
    supportSla: '1h phone',
    features: [
      '10,000 session credits/month — covers 1,000 × 20-min interviews (10 credits each)',
      '1,000+ AI interview sessions/month (mix of all durations)',
      '1,000+ voice minutes/month (ElevenLabs TTS/STT) — +5 credits/voice session',
      '25,000+ emails/month (Brevo transactional + campaigns)',
      '200 GB storage',
      'Unlimited recruiter seats',
      'Dedicated success manager',
      'Custom AI model fine-tuning',
      'SSO / SAML integration',
      'SOC 2 Type II compliance',
      'Custom SLA (99.9% uptime guarantee)',
      'White-label option available',
      'On-premise deployment option',
      'Custom reporting & BI integration',
      'Priority phone support (1h SLA)',
      'Quarterly business reviews',
      'Unlimited Airtable + Calendly integrations',
      'Overage: ₹3/credit — buy extra credits anytime',
    ],
  },
];

const bulkCreditPacks = [
  { id: 'pack-100', credits: 100, price: 490, bonus: 0, label: '100 Credits', perCredit: '₹4.9/credit' },
  { id: 'pack-500', credits: 500, price: 2000, bonus: 50, label: '500 Credits', popular: true, perCredit: '₹3.6/credit' },
  { id: 'pack-1000', credits: 1000, price: 3500, bonus: 150, label: '1,000 Credits', perCredit: '₹3.1/credit' },
  { id: 'pack-5000', credits: 5000, price: 14000, bonus: 1000, label: '5,000 Credits', perCredit: '₹2.5/credit' },
];

export default function B2BPricingContent() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [seats, setSeats] = useState<Record<string, number>>({
    'recruiter-starter': 3,
    'recruiter-professional': 10,
    'recruiter-business': 30,
  });
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showCreditRules, setShowCreditRules] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', company: '', email: '', seats: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getPrice = (plan: B2BPlan) => billing === 'annual' ? plan.annualPerSeat : plan.monthlyPerSeat;
  const getSeatCount = (planId: string) => seats[planId] || b2bPlans.find(p => p.id === planId)?.minSeats || 1;

  const updateSeats = (planId: string, delta: number) => {
    const plan = b2bPlans.find(p => p.id === planId)!;
    const current = getSeatCount(planId);
    const next = Math.max(plan.minSeats, Math.min(plan.maxSeats ?? 999, current + delta));
    setSeats(prev => ({ ...prev, [planId]: next }));
  };

  const getMonthlyTotal = (plan: B2BPlan) => {
    const seatCount = getSeatCount(plan.id);
    const pricePerSeat = getPrice(plan);
    return seatCount * pricePerSeat;
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(cents);
  };

  const faqs = [
    { q: 'What are session credits and how are they consumed?', a: 'Session credits are consumed per AI interview action. A 20-min interview = 10 credits. A 30-min interview = 15 credits. A 45-min interview = 22 credits. A 60-min interview = 30 credits. Voice add-on (ElevenLabs TTS) = +5 credits per session. AI evaluation/scoring = 4 credits. AI coaching = 2 credits. Credits reset monthly.' },
    { q: 'How does seat management work?', a: 'Each recruiter seat gives one team member full access — posting jobs, running AI interviews, scoring candidates, and viewing analytics. Add or remove seats anytime from your admin dashboard.' },
    { q: 'What happens when I exceed my included credits?', a: 'You are billed at the overage rate for your plan. Starter: ₹5/credit. Professional: ₹4/credit. Business: ₹3/credit. Alternatively, buy bulk credit packs at a discounted rate before you run out.' },
    { q: 'How is ElevenLabs voice usage calculated?', a: 'ElevenLabs TTS costs ~$0.10/1,000 characters (~₹8/1,000 chars). STT costs ~$0.22/hour (~₹18/hr). Your included voice minutes cover typical usage. Each voice session also consumes +5 credits from your session credit pool.' },
    { q: 'What does Razorpay cost?', a: 'Razorpay has no fixed monthly subscription. Standard rate is 2% + GST per successful transaction. This is a variable payment-processing cost, not included in plan pricing.' },
    { q: 'Can I mix Razorpay and Stripe for payments?', a: 'Yes. Indian companies can pay via Razorpay (INR). International companies can pay via Stripe (USD/EUR/GBP). Both gateways are fully supported.' },
    { q: 'Is there a free trial for B2B plans?', a: 'Yes — Recruiter Starter and Professional plans come with a 14-day free trial, no credit card required. Business/Enterprise plans include a custom POC period.' },
    { q: 'Can I buy extra credits without upgrading my plan?', a: 'Yes. Bulk credit packs are available at discounted rates. The more you buy, the lower the per-credit cost. Credits from packs never expire within your subscription period.' },
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setFormSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-sky-900/20 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-1.5 mb-6">
            <Building2 size={14} className="text-violet-400" />
            <span className="text-violet-300 text-sm font-medium">B2B Recruiter Plans — Credit-Based Pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Hire smarter with<br />
            <span className="bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">AI-powered interviews</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-4">
            Each plan includes a fixed monthly credit allowance. Credits are consumed strictly per action — 10 credits for a 20-min interview, 15 for 30-min, 22 for 45-min, 30 for 60-min. No hidden charges.
          </p>
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 mb-4">
            <AlertCircle size={13} className="text-amber-400" />
            <span className="text-amber-300 text-xs">Pricing reflects real infrastructure costs: OpenAI, Groq, ElevenLabs, Supabase, Railway, Brevo, Airtable, Calendly. Razorpay: 2% + GST per transaction (variable, not in plan price).</span>
          </div>

          {/* Credit Rules Toggle */}
          <button
            onClick={() => setShowCreditRules(!showCreditRules)}
            className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-2 mb-6 hover:bg-indigo-500/20 transition-colors"
          >
            <Coins size={13} className="text-indigo-400" />
            <span className="text-indigo-300 text-xs font-medium">View credit consumption rules</span>
            <ChevronDown size={12} className={`text-indigo-400 transition-transform ${showCreditRules ? 'rotate-180' : ''}`} />
          </button>

          {showCreditRules && (
            <div className="max-w-2xl mx-auto mb-6 bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden text-left">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-800/80">
                <div className="flex items-center gap-2">
                  <Coins size={15} className="text-indigo-400" />
                  <span className="text-sm font-700 text-white">Credit Consumption Rules</span>
                </div>
                <button onClick={() => setShowCreditRules(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="divide-y divide-slate-700/50">
                {CREDIT_RULES.map((rule, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{rule.icon}</span>
                      <div>
                        <span className="text-sm text-slate-200">{rule.action}</span>
                        {rule.note && <span className="text-xs text-slate-500 ml-1">({rule.note})</span>}
                      </div>
                    </div>
                    <span className="text-sm font-700 text-indigo-400 whitespace-nowrap ml-4">{rule.credits} credits</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-amber-500/10 border-t border-amber-500/20">
                <p className="text-xs text-amber-300">
                  <strong>Example:</strong> A 30-min voice interview = 15 credits (session) + 5 credits (voice add-on) = <strong>20 credits total</strong>
                </p>
              </div>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-slate-800/60 border border-slate-700 rounded-xl p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billing === 'annual' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Annual
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {b2bPlans.map((plan) => {
            const price = getPrice(plan);
            const seatCount = getSeatCount(plan.id);
            const monthlyTotal = getMonthlyTotal(plan);

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-gradient-to-b ${plan.gradient} ${plan.borderColor} p-6 flex flex-col gap-5 ${plan.popular ? 'ring-2 ring-violet-500/50 ring-offset-2 ring-offset-[#0a0f1e]' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">Most Popular</span>
                  </div>
                )}

                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {plan.icon}
                    <span className="font-bold text-white text-lg">{plan.name}</span>
                  </div>
                  <p className="text-slate-400 text-xs">{plan.tagline}</p>
                  <div className="mt-2 inline-flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-2 py-1">
                    <Info size={10} className="text-slate-500" />
                    <span className="text-[10px] text-slate-500">{plan.infraReserve}</span>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-white">{formatPrice(price)}</span>
                    <span className="text-slate-400 text-sm mb-1">/{plan.seatLabel}/mo</span>
                  </div>
                  {billing === 'annual' && (
                    <p className="text-xs text-emerald-400 font-medium mt-0.5">Billed annually (20% off)</p>
                  )}
                </div>

                {/* Credit Badge */}
                <div className="bg-slate-800/60 border border-indigo-500/30 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Coins size={14} className="text-indigo-400" />
                      <span className="text-sm font-700 text-white">{plan.sessionCredits.toLocaleString('en-IN')} credits/month</span>
                    </div>
                    <span className="text-xs font-600 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {plan.id === 'recruiter-starter' ? '50 sessions' : plan.id === 'recruiter-professional' ? '200 sessions' : '1,000 sessions'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                    <span>20-min: 10 credits</span>
                    <span>30-min: 15 credits</span>
                    <span>45-min: 22 credits</span>
                    <span>Voice add-on: +5 credits</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">Overage: <span className="text-indigo-400 font-600">{plan.overageCreditRate}</span></p>
                </div>

                {/* Seat Selector */}
                <div className="bg-slate-800/40 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Recruiter seats</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateSeats(plan.id, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                      >
                        <Minus size={12} className="text-slate-300" />
                      </button>
                      <span className="text-white font-bold text-sm w-6 text-center">{seatCount}</span>
                      <button
                        onClick={() => updateSeats(plan.id, 1)}
                        className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                      >
                        <Plus size={12} className="text-slate-300" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Monthly total</span>
                    <span className="text-sm font-bold text-white">{formatPrice(monthlyTotal)}/mo</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-slate-300 leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* SLA badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1 text-slate-400">
                    <Shield size={9} /> {plan.sla}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1 text-slate-400">
                    <Headphones size={9} /> {plan.supportSla}
                  </span>
                </div>

                {/* CTA */}
                <Link
                  href="/recruiter-signup"
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all ${plan.popular ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                >
                  {plan.id === 'recruiter-business' ? 'Contact Sales' : 'Start Free Trial'}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Enterprise */}
        <div className="mt-6 rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-800/60 to-slate-900/60 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center">
              <Globe size={22} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Enterprise</h3>
              <p className="text-slate-400 text-sm">Custom credits, seats, SLA, white-label, on-premise. ~$1,000+/mo infra reserve.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-white font-bold">Custom pricing</p>
              <p className="text-slate-400 text-xs">Starting from ₹1,00,000/mo</p>
            </div>
            <Link
              href="#contact"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>

      {/* Credit Breakdown Table */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/60">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-indigo-400" />
              <h2 className="text-base font-bold text-white">Credit consumption — B2B plan breakdown</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">Exact sessions you can run per plan per month at standard credit rates.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-5 py-3 text-xs font-700 text-slate-400">Action</th>
                  <th className="text-center px-3 py-3 text-xs font-700 text-slate-400">Credits</th>
                  <th className="text-center px-3 py-3 text-xs font-700 text-sky-400">Starter (500)</th>
                  <th className="text-center px-3 py-3 text-xs font-700 text-violet-400">Professional (2,000)</th>
                  <th className="text-center px-3 py-3 text-xs font-700 text-amber-400">Business (10,000)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {[
                  { action: '20-min AI interview', credits: 10, starter: 50, pro: 200, biz: 1000 },
                  { action: '30-min AI interview', credits: 15, starter: 33, pro: 133, biz: 666 },
                  { action: '45-min AI interview', credits: 22, starter: 22, pro: 90, biz: 454 },
                  { action: '60-min AI interview', credits: 30, starter: 16, pro: 66, biz: 333 },
                  { action: 'Voice add-on (TTS)', credits: 5, starter: 'per session', pro: 'per session', biz: 'per session' },
                  { action: 'AI evaluation/scoring', credits: 4, starter: 125, pro: 500, biz: 2500 },
                  { action: 'LSRW session', credits: 8, starter: 62, pro: 250, biz: 1250 },
                  { action: 'Coding assessment', credits: 5, starter: 100, pro: 400, biz: 2000 },
                  { action: 'Resume ATS check', credits: 3, starter: 166, pro: 666, biz: 3333 },
                  { action: 'AI coaching / Q&A', credits: 2, starter: 250, pro: 1000, biz: 5000 },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-700/20">
                    <td className="px-5 py-2.5 text-xs text-slate-300">{row.action}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs font-700 text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{row.credits}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-sky-400 font-600">{row.starter}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-violet-400 font-600">{row.pro}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-amber-400 font-600">{row.biz}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700 bg-slate-800/60">
                  <td className="px-5 py-3 text-xs font-700 text-white">Total credits/month</td>
                  <td className="px-3 py-3 text-center text-xs text-slate-400">—</td>
                  <td className="px-3 py-3 text-center text-xs font-700 text-sky-400">500</td>
                  <td className="px-3 py-3 text-center text-xs font-700 text-violet-400">2,000</td>
                  <td className="px-3 py-3 text-center text-xs font-700 text-amber-400">10,000</td>
                </tr>
                <tr className="bg-slate-800/60">
                  <td className="px-5 py-3 text-xs font-700 text-white">Overage rate</td>
                  <td className="px-3 py-3 text-center text-xs text-slate-400">—</td>
                  <td className="px-3 py-3 text-center text-xs text-sky-400 font-600">₹5/credit</td>
                  <td className="px-3 py-3 text-center text-xs text-violet-400 font-600">₹4/credit</td>
                  <td className="px-3 py-3 text-center text-xs text-amber-400 font-600">₹3/credit</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Bulk Credit Packs */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Bulk Credit Packs</h2>
          <p className="text-slate-400 text-sm">Buy extra credits at a discount. Credits never expire within your subscription period.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {bulkCreditPacks.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-xl border p-5 text-center ${pack.popular ? 'border-violet-500/50 bg-violet-500/10' : 'border-slate-700 bg-slate-800/40'}`}
            >
              {pack.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Best Value</span>
                </div>
              )}
              <div className="text-2xl font-bold text-white mb-1">{pack.label}</div>
              {pack.bonus > 0 && (
                <div className="text-xs text-emerald-400 font-medium mb-2">+{pack.bonus} bonus credits</div>
              )}
              <div className="text-lg font-bold text-white mb-1">₹{pack.price.toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-400">{pack.perCredit}</div>
              <button className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition-colors ${pack.popular ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                Buy Pack
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/40 transition-colors"
              >
                <span className="text-sm font-medium text-white">{faq.q}</span>
                {expandedFaq === i ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>
              {expandedFaq === i && (
                <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-slate-700/50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div id="contact" className="max-w-2xl mx-auto px-6 pb-16">
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-2 text-center">Talk to Sales</h2>
          <p className="text-slate-400 text-sm text-center mb-6">For Enterprise plans, custom credits, or volume discounts.</p>
          {formSubmitted ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-emerald-400" />
              </div>
              <p className="text-white font-medium">Thanks! We'll be in touch within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your name"
                  value={contactForm.name}
                  onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                  className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={contactForm.company}
                  onChange={e => setContactForm(p => ({ ...p, company: e.target.value }))}
                  className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
              <input
                type="email"
                placeholder="Work email"
                value={contactForm.email}
                onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                required
              />
              <input
                type="number"
                placeholder="Estimated seats needed"
                value={contactForm.seats}
                onChange={e => setContactForm(p => ({ ...p, seats: e.target.value }))}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <textarea
                placeholder="Tell us about your hiring needs..."
                value={contactForm.message}
                onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                rows={3}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
