'use client';
import React, { useState } from 'react';
import {
  Check, Users, Zap, Crown, Building2, ChevronDown, ChevronUp, Minus, Plus,
  ArrowRight, Shield, Clock, BarChart3, Headphones, Globe, AlertCircle, Mic, FileText, TrendingUp, Sparkles
} from 'lucide-react';
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
  sessionCreditsIncluded: number | 'Unlimited';
  voiceMinutes: number | 'Unlimited';
  emailsPerMonth: number | 'Unlimited';
  aiInteractions: number | 'Unlimited';
  storage: string;
  overageAI: string;
  overageVoice: string;
  extraCreditPrice: number;
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

const b2bPlans: B2BPlan[] = [
  {
    id: 'recruiter-starter',
    name: 'Recruiter Starter',
    tagline: 'For small teams hiring 1–10 roles/month',
    infraReserve: '~$175/mo infrastructure reserve',
    monthlyPerSeat: 4999,
    annualPerSeat: 3999,
    minSeats: 1,
    maxSeats: 5,
    sessionCreditsIncluded: 50,
    voiceMinutes: 30,
    emailsPerMonth: 500,
    aiInteractions: 100,
    storage: '10 GB',
    overageAI: '₹15/extra interaction',
    overageVoice: '₹2/extra voice min',
    extraCreditPrice: 49,
    color: 'text-sky-400',
    gradient: 'from-sky-500/20 to-cyan-500/10',
    borderColor: 'border-sky-500/40',
    icon: <Zap size={22} className="text-sky-400" />,
    seatLabel: 'recruiter seat',
    sla: '99.5% uptime',
    supportSla: '48h email',
    features: [
      '100 AI interactions/month (interviews + evaluations)',
      '50 AI interview session credits/month',
      '30 voice minutes/month (ElevenLabs TTS/STT)',
      '500 emails/month (Brevo transactional)',
      '10 GB storage',
      'Up to 5 recruiter seats',
      'Candidate scoring & ranking',
      'Interview question bank (500+ questions)',
      'Basic ATS integration (CSV export)',
      'Email support (48h SLA)',
      'Candidate feedback reports',
      'Job posting management',
      '1 Airtable integration, 1 Calendly connection',
    ],
  },
  {
    id: 'recruiter-professional',
    name: 'Recruiter Professional',
    tagline: 'For scaling teams with structured pipelines',
    infraReserve: '~$350–400/mo infrastructure reserve',
    monthlyPerSeat: 9999,
    annualPerSeat: 7999,
    minSeats: 5,
    maxSeats: 25,
    sessionCreditsIncluded: 500,
    voiceMinutes: 300,
    emailsPerMonth: 5000,
    aiInteractions: 500,
    storage: '50 GB',
    overageAI: '₹12/extra interaction',
    overageVoice: '₹1.5/extra voice min',
    extraCreditPrice: 39,
    color: 'text-violet-400',
    gradient: 'from-violet-500/20 to-purple-500/10',
    borderColor: 'border-violet-500/40',
    icon: <BarChart3 size={22} className="text-violet-400" />,
    popular: true,
    seatLabel: 'recruiter seat',
    sla: '99.7% uptime',
    supportSla: '12h priority',
    features: [
      '500 AI interactions/month (interviews, coaching, agents)',
      '500 AI interview session credits/month',
      '300 voice minutes/month (ElevenLabs TTS/STT)',
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
    sessionCreditsIncluded: 2000,
    voiceMinutes: 1000,
    emailsPerMonth: 25000,
    aiInteractions: 2000,
    storage: '200 GB',
    overageAI: '₹10/extra interaction',
    overageVoice: '₹1/extra voice min',
    extraCreditPrice: 29,
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/40',
    icon: <Crown size={22} className="text-amber-400" />,
    seatLabel: 'recruiter seat',
    sla: '99.9% uptime SLA',
    supportSla: '1h phone',
    features: [
      '2,000+ AI interactions/month (interviews, evaluation, agents, content)',
      '2,000 AI interview session credits/month',
      '1,000+ voice minutes/month (ElevenLabs TTS/STT)',
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
    ],
  },
];

const bulkCreditPacks = [
  { id: 'pack-100', credits: 100, price: 3900, bonus: 0, label: '100 Credits', perCredit: '₹39/credit' },
  { id: 'pack-250', credits: 250, price: 8750, bonus: 25, label: '250 Credits', popular: true, perCredit: '₹31/credit' },
  { id: 'pack-500', credits: 500, price: 14500, bonus: 75, label: '500 Credits', perCredit: '₹25/credit' },
  { id: 'pack-1000', credits: 1000, price: 24000, bonus: 200, label: '1,000 Credits', perCredit: '₹20/credit' },
];

export default function B2BPricingContent() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [seats, setSeats] = useState<Record<string, number>>({
    'recruiter-starter': 3,
    'recruiter-professional': 10,
    'recruiter-business': 30,
  });
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
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
    { q: 'How does seat management work?', a: 'Each recruiter seat gives one team member full access — posting jobs, running AI interviews, scoring candidates, and viewing analytics. Add or remove seats anytime from your admin dashboard.' },
    { q: 'What are session credits and how are they different from AI interactions?', a: 'Session credits = one complete AI interview session (candidate-facing). AI interactions = any AI call (evaluation, coaching, content generation). Session credits are a subset of AI interactions. Both are included in your monthly allowance.' },
    { q: 'What happens when I exceed my included allowance?', a: 'You are billed at the overage rate for your plan. Starter: ₹15/extra AI interaction, ₹2/extra voice min. Professional: ₹12/extra AI interaction, ₹1.5/extra voice min. Business: ₹10/extra AI interaction, ₹1/extra voice min. Overage is billed at end of billing cycle.' },
    { q: 'How is ElevenLabs voice usage calculated?', a: 'ElevenLabs TTS costs ~$0.10/1,000 characters (~₹8/1,000 chars). STT costs ~$0.22/hour (~₹18/hr). Your included voice minutes cover typical usage. Heavy voice/telecalling usage may incur overages.' },
    { q: 'What does Razorpay cost?', a: 'Razorpay has no fixed monthly subscription. Standard rate is 2% + GST per successful transaction. This is a variable payment-processing cost, not included in plan pricing.' },
    { q: 'Can I mix Razorpay and Stripe for payments?', a: 'Yes. Indian companies can pay via Razorpay (INR). International companies can pay via Stripe (USD/EUR/GBP). Both gateways are fully supported.' },
    { q: 'Is there a free trial for B2B plans?', a: 'Yes — Recruiter Starter and Professional plans come with a 14-day free trial, no credit card required. Business/Enterprise plans include a custom POC period.' },
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
            <span className="text-violet-300 text-sm font-medium">B2B Recruiter Plans — Usage-Based Pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Hire smarter with<br />
            <span className="bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">AI-powered interviews</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-4">
            Structured plans for recruiting teams of all sizes. Each plan includes a fixed monthly allowance of AI interactions, voice minutes, emails, and storage. Pay overage only when you exceed your allowance.
          </p>
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 mb-8">
            <AlertCircle size={13} className="text-amber-400" />
            <span className="text-amber-300 text-xs">Pricing reflects real infrastructure costs: OpenAI, Groq, ElevenLabs, Supabase, Railway, Brevo, Airtable, Calendly. Razorpay: 2% + GST per transaction (variable, not in plan price).</span>
          </div>

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
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {b2bPlans.map((plan) => {
            const monthlyTotal = getMonthlyTotal(plan);
            const seatCount = getSeatCount(plan.id);

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border ${plan.borderColor} bg-gradient-to-b ${plan.gradient} bg-slate-900/80 overflow-hidden flex flex-col ${plan.popular ? 'ring-2 ring-violet-500/50 scale-[1.02]' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold text-center py-1.5 tracking-wide">
                    MOST POPULAR
                  </div>
                )}

                <div className={`p-7 ${plan.popular ? 'pt-10' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-slate-800 border ${plan.borderColor} flex items-center justify-center`}>
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                      <p className="text-slate-500 text-xs">{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Infra reserve badge */}
                  <div className="inline-flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1 mb-4">
                    <TrendingUp size={11} className="text-slate-400" />
                    <span className="text-slate-400 text-[10px]">{plan.infraReserve}</span>
                  </div>

                  {/* Pricing */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-bold text-white">{formatPrice(getPrice(plan))}</span>
                      <span className="text-slate-500 text-sm">/ seat / {billing === 'annual' ? 'mo (billed annually)' : 'month'}</span>
                    </div>
                    {billing === 'annual' && (
                      <div className="text-slate-500 text-xs line-through">{formatPrice(plan.monthlyPerSeat)} / seat / month</div>
                    )}
                  </div>

                  {/* Seat Management */}
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-slate-300 text-sm font-medium">Recruiter Seats</span>
                      </div>
                      <span className="text-xs text-slate-500">{plan.minSeats}–{plan.maxSeats ?? '∞'} seats</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateSeats(plan.id, -1)}
                        disabled={seatCount <= plan.minSeats}
                        className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-white font-bold text-xl">{seatCount}</span>
                        <span className="text-slate-500 text-xs ml-1">seats</span>
                      </div>
                      <button
                        onClick={() => updateSeats(plan.id, 1)}
                        disabled={plan.maxSeats !== null && seatCount >= plan.maxSeats}
                        className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                      <span className="text-slate-500 text-xs">Monthly total</span>
                      <span className="text-white font-semibold text-sm">{formatPrice(monthlyTotal)}</span>
                    </div>
                  </div>

                  {/* Included Allowance Summary */}
                  <div className="bg-slate-800/40 rounded-xl p-3 mb-4 border border-slate-700/40 space-y-1.5">
                    <p className="text-[10px] font-700 text-slate-400 uppercase tracking-wider mb-2">Included Monthly Allowance</p>
                    {[
                      { icon: <Sparkles size={11} className="text-violet-400" />, label: `${typeof plan.aiInteractions === 'number' ? plan.aiInteractions.toLocaleString() : plan.aiInteractions} AI interactions` },
                      { icon: <Zap size={11} className={plan.color} />, label: `${typeof plan.sessionCreditsIncluded === 'number' ? plan.sessionCreditsIncluded.toLocaleString() : plan.sessionCreditsIncluded} session credits` },
                      { icon: <Mic size={11} className="text-blue-400" />, label: `${typeof plan.voiceMinutes === 'number' ? plan.voiceMinutes.toLocaleString() : plan.voiceMinutes} voice minutes (ElevenLabs)` },
                      { icon: <FileText size={11} className="text-amber-400" />, label: `${typeof plan.emailsPerMonth === 'number' ? plan.emailsPerMonth.toLocaleString() : plan.emailsPerMonth} emails/mo (Brevo)` },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {item.icon}
                        <span className="text-slate-300 text-xs">{item.label}</span>
                      </div>
                    ))}
                    <div className="pt-1.5 border-t border-slate-700/40 mt-1">
                      <span className="text-slate-500 text-[10px]">Overage: {plan.overageAI} · {plan.overageVoice}</span>
                    </div>
                  </div>

                  {/* SLA */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Shield size={11} className="text-emerald-400" />
                      <span>{plan.sla}</span>
                    </div>
                    <div className="w-px h-3 bg-slate-700" />
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Headphones size={11} className="text-sky-400" />
                      <span>{plan.supportSla}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  {plan.id === 'recruiter-business' ? (
                    <a
                      href="#contact"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90"
                    >
                      Contact Sales <ArrowRight size={15} />
                    </a>
                  ) : (
                    <button
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${plan.popular ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:opacity-90' : 'bg-slate-700 border border-slate-600 text-white hover:bg-slate-600'}`}
                    >
                      Start 14-day Free Trial <ArrowRight size={15} />
                    </button>
                  )}
                </div>

                {/* Features */}
                <div className="px-7 pb-7 flex-1">
                  <div className="border-t border-slate-700/50 pt-5">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">What's included</p>
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check size={14} className={`${plan.color} mt-0.5 flex-shrink-0`} />
                          <span className="text-slate-300 text-sm leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise Custom Tier */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={18} className="text-amber-400" />
              <h3 className="text-white font-bold text-lg">Enterprise — Custom Pricing</h3>
              <span className="text-[10px] font-700 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">~$1,000+/mo infra reserve</span>
            </div>
            <p className="text-slate-400 text-sm max-w-xl">For heavy AI interviews, telecalling, voice automation, analytics, and multi-tenant deployments. Includes dedicated infrastructure, custom AI token allowances, unlimited voice minutes, 100,000+ emails/mo, custom SLA, and white-label options.</p>
            <div className="flex flex-wrap gap-3 mt-3">
              {['Unlimited AI interactions', 'Unlimited voice minutes', '100,000+ emails/mo', 'Custom AI model fine-tuning', 'Dedicated infra', 'Custom SLA 99.99%'].map(f => (
                <span key={f} className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">{f}</span>
              ))}
            </div>
          </div>
          <a href="#contact" className="shrink-0 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all">
            Get Custom Quote <ArrowRight size={15} />
          </a>
        </div>
      </div>

      {/* Bulk Session Credits */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap size={20} className="text-sky-400" />
            <h2 className="text-xl font-bold text-white">Bulk Session Credit Packs</h2>
          </div>
          <p className="text-slate-400 text-sm mb-2">Top up your team's session credits at any time. Bigger packs = lower per-credit cost. Credits valid for 6 months.</p>
          <p className="text-slate-500 text-xs mb-8">1 session credit = 1 complete AI interview session (candidate-facing). Separate from AI interaction overage billing.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {bulkCreditPacks.map((pack) => (
              <div
                key={pack.id}
                className={`relative rounded-xl border p-5 text-center transition-all cursor-pointer hover:border-sky-500/50 ${pack.popular ? 'border-sky-500/50 bg-sky-500/5 ring-1 ring-sky-500/30' : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60'}`}
              >
                {pack.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Best Value
                  </div>
                )}
                <div className="text-2xl font-bold text-white mb-1">{pack.label}</div>
                {pack.bonus > 0 && (
                  <div className="text-sky-400 text-xs font-medium mb-2">+{pack.bonus} bonus credits</div>
                )}
                <div className="text-slate-300 font-semibold text-lg mb-1">{formatPrice(pack.price)}</div>
                <div className="text-slate-500 text-xs mb-4">{pack.perCredit}</div>
                <button className="w-full py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-600 transition-colors">
                  Add to Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan Comparison Table */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Full Plan Comparison</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/60">
                <th className="text-left px-6 py-4 text-slate-400 font-medium w-1/4">Feature</th>
                {b2bPlans.map(p => (
                  <th key={p.id} className={`px-6 py-4 text-center font-semibold ${p.color}`}>{p.name}</th>
                ))}
                <th className="px-6 py-4 text-center font-semibold text-amber-400">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Infrastructure Reserve', '~$175/mo', '~$350–400/mo', '~$600/mo', '~$1,000+/mo'],
                ['Recruiter Seats', '1–5', '5–25', '25+', 'Unlimited'],
                ['AI Interactions / Month', '100', '500', '2,000+', 'Unlimited'],
                ['Session Credits / Month', '50', '500', '2,000', 'Unlimited'],
                ['Voice Minutes / Month (ElevenLabs)', '30 min', '300 min', '1,000+ min', 'Unlimited'],
                ['Emails / Month (Brevo)', '500', '5,000', '25,000+', '100,000+'],
                ['Storage', '10 GB', '50 GB', '200 GB', 'Custom'],
                ['Overage — AI Interaction', '₹15/extra', '₹12/extra', '₹10/extra', 'Custom'],
                ['Overage — Voice Minute', '₹2/extra', '₹1.5/extra', '₹1/extra', 'Custom'],
                ['Candidate Analytics', 'Basic', 'Advanced', 'Custom', 'Custom + BI'],
                ['ATS Integration', 'CSV Export', 'Full API', 'Custom + On-prem', 'Custom + On-prem'],
                ['Interview Recording', '✗', '✓', '✓', '✓'],
                ['Custom Competency Frameworks', '✗', '✓', '✓', '✓'],
                ['SSO / SAML', '✗', '✗', '✓', '✓'],
                ['Dedicated Success Manager', '✗', '✗', '✓', '✓'],
                ['SLA Uptime', '99.5%', '99.7%', '99.9%', '99.99%'],
                ['Support SLA', '48h email', '12h priority', '1h phone', 'Dedicated'],
              ].map((row, i) => {
                const [feature, ...rowVals] = row;
                return (
                  <tr key={i} className={`border-b border-slate-800/60 ${i % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
                    <td className="px-6 py-3.5 text-slate-300 font-medium">{feature}</td>
                    {rowVals.map((val, j) => (
                      <td key={j} className="px-6 py-3.5 text-center text-slate-400">
                        {val === '✓' ? <Check size={16} className="text-emerald-400 mx-auto" /> :
                         val === '✗' ? <span className="text-slate-600">—</span> :
                         <span className="text-slate-300 text-xs">{val}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Shield size={20} className="text-emerald-400" />, title: 'SOC 2 Type II', desc: 'Enterprise security (Business+)' },
            { icon: <Globe size={20} className="text-sky-400" />, title: 'Global Payments', desc: 'Stripe + Razorpay (2% + GST)' },
            { icon: <Clock size={20} className="text-violet-400" />, title: '14-Day Trial', desc: 'No credit card needed' },
            { icon: <Headphones size={20} className="text-amber-400" />, title: 'Dedicated Support', desc: 'Real humans, fast SLA' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{item.title}</div>
                <div className="text-slate-500 text-xs">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-slate-200 font-medium text-sm">{faq.q}</span>
                {expandedFaq === i ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
              </button>
              {expandedFaq === i && (
                <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed border-t border-slate-800">
                  <div className="pt-3">{faq.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise Contact Form */}
      <div id="contact" className="max-w-3xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-b from-slate-900/80 to-slate-900/40 border border-amber-500/30 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <Crown size={20} className="text-amber-400" />
            <h2 className="text-xl font-bold text-white">Contact Enterprise Sales</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6">Tell us about your team and we'll put together a custom quote within 24 hours. Include your expected AI interactions, voice minutes, and email volume for accurate pricing.</p>

          {formSubmitted ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Request received!</h3>
              <p className="text-slate-400 text-sm">Our enterprise team will reach out within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Full Name</label>
                  <input type="text" required value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Company</label>
                  <input type="text" required value={contactForm.company} onChange={e => setContactForm(p => ({ ...p, company: e.target.value }))} placeholder="Acme Corp" className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Work Email</label>
                  <input type="email" required value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@acme.com" className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Estimated Seats</label>
                  <input type="number" min="25" value={contactForm.seats} onChange={e => setContactForm(p => ({ ...p, seats: e.target.value }))} placeholder="e.g. 50" className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Tell us about your needs (AI usage, voice minutes, email volume)</label>
                <textarea rows={3} value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} placeholder="Team size, use case, expected AI interactions/month, voice minutes/month, integrations needed..." className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none" />
              </div>
              <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all">
                {submitting ? 'Sending...' : <>{`Request Enterprise Quote`} <ArrowRight size={15} /></>}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="text-center pb-12">
        <p className="text-slate-500 text-sm">
          Looking for individual candidate plans?{' '}
          <Link href="/pricing" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
            View B2C Pricing →
          </Link>
        </p>
      </div>
    </div>
  );
}
