'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check, Zap, Crown, Sparkles, Star, Users, Building2, ChevronRight,
  Shield, Clock, ArrowRight, BadgeCheck, Infinity, AlertCircle, TrendingUp, Mic, FileText
} from 'lucide-react';
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

// Infrastructure cost reserves (USD/mo): Starter $175, Professional $350, Business $600
const FALLBACK_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'AI interview prep for individual candidates. Infrastructure reserve: ~$175/mo.',
    cost_per_seat: 999,
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
      { id: 'f1', text: '100 AI interactions/month (mock interviews + Q&A)', included: true },
      { id: 'f2', text: '30 voice minutes/month (ElevenLabs TTS/STT)', included: true },
      { id: 'f3', text: '500 emails/month (Brevo transactional)', included: true },
      { id: 'f4', text: '5 Resume ATS checks/month', included: true },
      { id: 'f5', text: '1 Airtable integration', included: true },
      { id: 'f6', text: '1 Calendly connection', included: true },
      { id: 'f7', text: '5 GB storage', included: true },
      { id: 'f8', text: 'Communication + Clarity + Domain scores', included: true },
      { id: 'f9', text: 'Answer improvement suggestions', included: true },
      { id: 'f10', text: 'Email support (48h SLA)', included: true },
      { id: 'f11', text: 'Company-specific prep packs', included: false },
      { id: 'f12', text: 'Live recruiter interview access', included: false },
      { id: 'f13', text: 'Overage: ₹15/extra AI interaction, ₹2/extra voice min', included: false },
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Unlimited practice with advanced analytics & coaching. Infrastructure reserve: ~$350/mo.',
    cost_per_seat: 2499,
    seat_minimum: 1,
    seat_maximum: null,
    billing_period: 'monthly',
    is_published: true,
    is_popular: true,
    tier_order: 2,
    badge_label: 'Most Popular',
    cta_label: 'Start Free Trial',
    target_audience: 'Serious candidates & small teams',
    features: [
      { id: 'f1', text: '500 AI interactions/month (mock interviews, coaching, Q&A)', included: true },
      { id: 'f2', text: '300 voice minutes/month (ElevenLabs TTS/STT)', included: true },
      { id: 'f3', text: '5,000 emails/month (Brevo transactional + marketing)', included: true },
      { id: 'f4', text: 'Unlimited Resume ATS checks', included: true },
      { id: 'f5', text: 'Multiple Airtable integrations', included: true },
      { id: 'f6', text: 'Multiple Calendly connections', included: true },
      { id: 'f7', text: '25 GB storage', included: true },
      { id: 'f8', text: 'Full per-answer AI coaching + model answer library', included: true },
      { id: 'f9', text: 'Company-specific prep packs', included: true },
      { id: 'f10', text: 'Progress analytics dashboard', included: true },
      { id: 'f11', text: 'Priority support (12h SLA)', included: true },
      { id: 'f12', text: 'Live recruiter interview access', included: true },
      { id: 'f13', text: 'Overage: ₹12/extra AI interaction, ₹1.5/extra voice min', included: true },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Institution-scale hiring & placement platform. Infrastructure reserve: ~$600/mo.',
    cost_per_seat: 4999,
    seat_minimum: 10,
    seat_maximum: null,
    billing_period: 'monthly',
    is_published: true,
    is_popular: false,
    tier_order: 3,
    badge_label: 'Best Value',
    cta_label: 'Contact Sales',
    target_audience: 'Institutions & large organizations',
    features: [
      { id: 'f1', text: '2,000+ AI interactions/month (interviews, evaluation, agents)', included: true },
      { id: 'f2', text: '1,000+ voice minutes/month (ElevenLabs TTS/STT)', included: true },
      { id: 'f3', text: '25,000+ emails/month (Brevo transactional + campaigns)', included: true },
      { id: 'f4', text: 'Unlimited Resume ATS checks', included: true },
      { id: 'f5', text: 'Unlimited Airtable + Calendly integrations', included: true },
      { id: 'f6', text: '100 GB storage', included: true },
      { id: 'f7', text: 'Bulk candidate import & placement drive management', included: true },
      { id: 'f8', text: 'Dedicated success manager', included: true },
      { id: 'f9', text: 'Custom interview scenarios + question banks', included: true },
      { id: 'f10', text: 'Certificate of completion', included: true },
      { id: 'f11', text: 'SLA 99.9% uptime guarantee', included: true },
      { id: 'f12', text: 'Priority phone support (1h SLA)', included: true },
      { id: 'f13', text: 'Overage: ₹10/extra AI interaction, ₹1/extra voice min', included: true },
    ],
  },
];

const TIER_STYLES: Record<string, { icon: React.ReactNode; gradient: string; border: string; badge: string; cta: string }> = {
  starter: {
    icon: <Zap size={22} className="text-blue-600" />,
    gradient: 'from-blue-50 to-white',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    cta: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  professional: {
    icon: <Sparkles size={22} className="text-violet-600" />,
    gradient: 'from-violet-50 to-white',
    border: 'border-violet-300',
    badge: 'bg-violet-100 text-violet-700',
    cta: 'bg-violet-600 hover:bg-violet-700 text-white',
  },
  business: {
    icon: <Crown size={22} className="text-amber-600" />,
    gradient: 'from-amber-50 to-white',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-700',
    cta: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
};

function getStyle(tierId: string) {
  return TIER_STYLES[tierId] || {
    icon: <Star size={22} className="text-gray-500" />,
    gradient: 'from-gray-50 to-white',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-600',
    cta: 'bg-gray-700 hover:bg-gray-800 text-white',
  };
}

// Usage allowance summary per tier
const USAGE_SUMMARY: Record<string, { ai: string; voice: string; emails: string; storage: string; infra: string }> = {
  starter: { ai: '100 AI interactions', voice: '30 voice min', emails: '500 emails', storage: '5 GB', infra: '~$175/mo infra reserve' },
  professional: { ai: '500 AI interactions', voice: '300 voice min', emails: '5,000 emails', storage: '25 GB', infra: '~$350/mo infra reserve' },
  business: { ai: '2,000+ AI interactions', voice: '1,000+ voice min', emails: '25,000+ emails', storage: '100 GB', infra: '~$600/mo infra reserve' },
};

export default function PublicPricingContent() {
  const [tiers, setTiers] = useState<PricingTier[]>(FALLBACK_TIERS);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(true);

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

  const publishedTiers = tiers.filter(t => t.is_published).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#F0F4FF]">
      {/* Hero */}
      <div className="text-center pt-16 pb-10 px-4">
        <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-4 py-1.5 mb-6">
          <BadgeCheck size={14} className="text-[#0D9488]" />
          <span className="text-xs font-700 text-[#0D9488]">Transparent, usage-based pricing with included allowances</span>
        </div>
        <h1 className="text-4xl font-900 text-[#0D1B3E] mb-4 leading-tight">
          Invest in your career.<br />
          <span className="text-[#0D9488]">Pay only for what you use.</span>
        </h1>
        <p className="text-lg text-[#6B7A99] max-w-2xl mx-auto mb-4">
          Every plan includes a fixed monthly allowance of AI interactions, voice minutes, emails, and storage.
          Use within your allowance — pay overage only if you exceed it.
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {publishedTiers.map((tier) => {
            const style = getStyle(tier.id);
            const price = getPrice(tier);
            const isPopular = tier.is_popular;
            const usage = USAGE_SUMMARY[tier.id];

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl border-2 bg-gradient-to-b ${style.gradient} ${style.border} p-7 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isPopular ? 'shadow-lg ring-2 ring-violet-300 ring-offset-2' : ''}`}
              >
                {tier.badge_label && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-800 ${style.badge} border whitespace-nowrap`}>
                    {tier.badge_label}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-[#E8ECF4] flex items-center justify-center shadow-sm">
                    {style.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-800 text-[#0D1B3E]">{tier.name}</h3>
                    <p className="text-xs text-[#6B7A99]">{tier.target_audience}</p>
                  </div>
                </div>

                <p className="text-sm text-[#6B7A99] mb-4 leading-relaxed">{tier.description}</p>

                {/* Price */}
                <div className="mb-3">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-900 text-[#0D1B3E]">₹{price.toLocaleString()}</span>
                    <span className="text-sm text-[#6B7A99] mb-1.5">/seat/mo</span>
                  </div>
                  {billing === 'annual' && (
                    <p className="text-xs text-emerald-600 font-600 mt-0.5">
                      Billed annually · Save ₹{(tier.cost_per_seat - price) * 12}/seat/yr
                    </p>
                  )}
                </div>

                {/* Usage allowance summary */}
                {usage && (
                  <div className="bg-white/80 border border-[#E8ECF4] rounded-2xl p-3 mb-4 space-y-1.5">
                    <p className="text-[10px] font-800 text-[#0D9488] uppercase tracking-wider mb-2">Included Monthly Allowance</p>
                    {[
                      { icon: <Sparkles size={11} className="text-violet-500" />, label: usage.ai },
                      { icon: <Mic size={11} className="text-blue-500" />, label: usage.voice },
                      { icon: <FileText size={11} className="text-amber-500" />, label: usage.emails },
                      { icon: <TrendingUp size={11} className="text-teal-500" />, label: usage.storage },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {item.icon}
                        <span className="text-xs text-[#0D1B3E] font-600">{item.label}</span>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-[#E8ECF4] mt-1">
                      <span className="text-[10px] text-[#6B7A99]">{usage.infra}</span>
                    </div>
                  </div>
                )}

                {/* Seat info */}
                <div className="flex items-center gap-3 mb-5 py-3 border-y border-[#E8ECF4]">
                  <div className="flex items-center gap-1.5 text-xs text-[#6B7A99]">
                    <Users size={13} />
                    <span>Min <strong className="text-[#0D1B3E]">{tier.seat_minimum}</strong> seat{tier.seat_minimum > 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-px h-4 bg-[#E8ECF4]" />
                  <div className="flex items-center gap-1.5 text-xs text-[#6B7A99]">
                    {tier.seat_maximum ? (
                      <>
                        <Building2 size={13} />
                        <span>Up to <strong className="text-[#0D1B3E]">{tier.seat_maximum}</strong></span>
                      </>
                    ) : (
                      <>
                        <Infinity size={13} />
                        <span><strong className="text-[#0D1B3E]">Unlimited</strong> seats</span>
                      </>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href="/pricing"
                  className={`w-full py-3 rounded-2xl text-sm font-700 text-center transition-all flex items-center justify-center gap-2 mb-6 ${style.cta}`}
                >
                  {tier.cta_label}
                  <ArrowRight size={14} />
                </Link>

                {/* Features */}
                <div className="space-y-2.5">
                  {tier.features.map(f => (
                    <div key={f.id} className={`flex items-start gap-2.5 ${!f.included ? 'opacity-40' : ''}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${f.included ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        {f.included
                          ? <Check size={10} className="text-emerald-600" />
                          : <span className="text-gray-400 text-[10px]">—</span>
                        }
                      </div>
                      <span className={`text-sm ${f.included ? 'text-[#0D1B3E]' : 'text-[#9BA8C0] line-through'}`}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overage & Infrastructure Note */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl p-6">
          <h3 className="text-sm font-800 text-[#0D1B3E] mb-3 flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-500" />
            How Usage & Overage Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#6B7A99]">
            <div>
              <p className="font-700 text-[#0D1B3E] mb-1">AI Interactions</p>
              <p>Powered by OpenAI GPT & Groq. Each mock interview, coaching session, or AI evaluation = 1 interaction. Overage billed at plan rate.</p>
            </div>
            <div>
              <p className="font-700 text-[#0D1B3E] mb-1">Voice Minutes (ElevenLabs)</p>
              <p>TTS costs ~₹8/1,000 chars, STT ~₹18/hr. Included minutes cover typical usage. Overage billed per minute at plan rate.</p>
            </div>
            <div>
              <p className="font-700 text-[#0D1B3E] mb-1">Payment Processing (Razorpay)</p>
              <p>No fixed monthly fee. Standard 2% + GST per successful transaction. This is variable and not included in plan pricing.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust signals */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: <Shield size={18} className="text-[#0D9488]" />, title: 'Secure Payments', desc: 'Razorpay-powered checkout with PCI DSS compliance. 2% + GST per transaction.' },
            { icon: <Clock size={18} className="text-[#0D9488]" />, title: 'Cancel Anytime', desc: 'No lock-in. Downgrade or cancel with one click. Unused credits roll over 3 months.' },
            { icon: <BadgeCheck size={18} className="text-[#0D9488]" />, title: '99.9% Uptime SLA', desc: 'Enterprise-grade reliability on Business plan. 99.5% on Professional.' },
          ].map(t => (
            <div key={t.title} className="flex items-start gap-3 bg-white rounded-2xl border border-[#E8ECF4] p-4">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">{t.icon}</div>
              <div>
                <p className="text-sm font-700 text-[#0D1B3E]">{t.title}</p>
                <p className="text-xs text-[#6B7A99] mt-0.5">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-[#6B7A99]">
            Need a custom plan for your institution?{' '}
            <Link href="/institution-subscription" className="text-[#0D9488] font-700 hover:underline">
              View Institution Plans <ChevronRight size={13} className="inline" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
