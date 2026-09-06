'use client';
import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { Check, Zap, Crown, Star, Sparkles, Plus, Minus, ShoppingCart, X, Shield, AlertCircle, CheckCircle2, Loader2, Lock, Coins, ChevronDown } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  infraReserve: string;
  color: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  icon: React.ReactNode;
  popular?: boolean;
  features: string[];
  credits: number;
  sessionsLabel: string;
  overageRate: string;
  usageAllowance: { ai: string; voice: string; emails: string; storage: string };
  limits: { interviews: number | string; assessments: number | string; resumeChecks: number | string; sessions: number | string };
}

interface CreditAddon {
  id: string;
  credits: number;
  price: number;
  bonus: number;
  popular?: boolean;
}

interface CartItem {
  type: 'plan' | 'addon';
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface OrderRecord {
  orderId: string;
  paymentId: string;
  planName: string;
  amount: number;
  status: 'success' | 'failed';
  timestamp: string;
}

// ─── Credit Consumption Rules ─────────────────────────────────────────────────
const CREDIT_RULES = [
  { action: '20-min mock interview', credits: 10, icon: '🎤' },
  { action: '30-min mock interview', credits: 15, icon: '🎤' },
  { action: '45-min mock interview', credits: 22, icon: '🎤' },
  { action: '60-min mock interview', credits: 30, icon: '🎤' },
  { action: 'Voice interview add-on (ElevenLabs TTS)', credits: 5, icon: '🔊', note: 'per session, on top of base' },
  { action: 'LSRW session', credits: 8, icon: '📚' },
  { action: 'Coding assessment', credits: 5, icon: '💻' },
  { action: 'Resume ATS check', credits: 3, icon: '📄' },
  { action: 'AI coaching / Q&A interaction', credits: 2, icon: '🤖' },
  { action: 'Company pack redemption', credits: 50, icon: '🏢' },
];

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Try AI interview practice — no card required',
    infraReserve: 'Shared infrastructure',
    color: 'text-slate-600',
    accentColor: '#64748B',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    badgeColor: 'bg-slate-100 text-slate-600',
    icon: <Star size={20} className="text-slate-500" />,
    credits: 30,
    sessionsLabel: '3 sessions',
    overageRate: 'Upgrade required',
    features: [
      '30 credits/month',
      '3 × 20-min mock interviews (10 credits each)',
      '5 voice minutes (ElevenLabs TTS) — +5 credits/session',
      '2 AI coaching interactions (2 credits each)',
      'Basic Communication score',
      'Interview history (last 5)',
      'Community support',
    ],
    usageAllowance: { ai: '3 AI interactions', voice: '5 voice min', emails: '50 emails', storage: '500 MB' },
    limits: { interviews: 3, assessments: 0, resumeChecks: 0, sessions: 3 },
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 499,
    annualPrice: 399,
    description: 'Full AI coaching for serious candidates. ~$175/mo infra reserve.',
    infraReserve: '~$175/mo infra reserve',
    color: 'text-blue-700',
    accentColor: '#2563EB',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    badgeColor: 'bg-blue-100 text-blue-700',
    icon: <Zap size={20} className="text-blue-600" />,
    credits: 100,
    sessionsLabel: '10 sessions',
    overageRate: '₹5/credit',
    features: [
      '100 credits/month — covers exactly 10 sessions',
      '10 × 20-min mock interviews (10 credits each)',
      '30 voice minutes/month (ElevenLabs TTS/STT) — +5 credits/voice session',
      '10 AI coaching interactions (2 credits each)',
      '5 Resume ATS checks (3 credits each)',
      '500 emails/month (Brevo transactional)',
      '5 GB storage',
      '1 Airtable integration, 1 Calendly connection',
      'Communication + Clarity + Domain scores',
      'Answer improvement suggestions',
      'Email support (48h SLA)',
      'Overage: ₹5/credit — buy extra credits anytime',
    ],
    usageAllowance: { ai: '100 AI interactions', voice: '30 voice min', emails: '500 emails', storage: '5 GB' },
    limits: { interviews: 10, assessments: 5, resumeChecks: 5, sessions: 10 },
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 1499,
    annualPrice: 1199,
    description: 'Serious prep with analytics & coaching. ~$350/mo infra reserve.',
    infraReserve: '~$350/mo infra reserve',
    color: 'text-violet-700',
    accentColor: '#7C3AED',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-400',
    badgeColor: 'bg-violet-100 text-violet-700',
    icon: <Sparkles size={20} className="text-violet-600" />,
    popular: true,
    credits: 350,
    sessionsLabel: '35 sessions',
    overageRate: '₹4/credit',
    features: [
      '350 credits/month — covers exactly 35 sessions',
      '23 × 20-min mock interviews (10 credits = 230 credits)',
      '4 × 30-min mock interviews (15 credits = 60 credits)',
      '5 LSRW sessions (8 credits each = 40 credits)',
      '10 AI coaching interactions (2 credits each = 20 credits)',
      '300 voice minutes/month (ElevenLabs TTS/STT)',
      '5,000 emails/month (Brevo transactional + marketing)',
      'Unlimited Resume ATS checks (3 credits each)',
      '25 GB storage',
      'Multiple Airtable + Calendly integrations',
      'Full per-answer AI coaching + model answer library',
      'Company-specific prep packs (50 credits each)',
      'Progress analytics dashboard',
      'Priority support (12h SLA)',
      'Overage: ₹4/credit — buy extra credits anytime',
    ],
    usageAllowance: { ai: '350 AI interactions', voice: '300 voice min', emails: '5,000 emails', storage: '25 GB' },
    limits: { interviews: 35, assessments: 'Unlimited', resumeChecks: 'Unlimited', sessions: 35 },
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 3499,
    annualPrice: 2799,
    description: 'Maximum prep power for placement-focused candidates. ~$600/mo infra reserve.',
    infraReserve: '~$600/mo infra reserve',
    color: 'text-amber-700',
    accentColor: '#D97706',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    badgeColor: 'bg-amber-100 text-amber-700',
    icon: <Crown size={20} className="text-amber-600" />,
    credits: 1000,
    sessionsLabel: '100 sessions',
    overageRate: '₹3/credit',
    features: [
      '1,000 credits/month — covers exactly 100 sessions',
      '40 × 20-min mock interviews (10 credits = 400 credits)',
      '20 × 30-min mock interviews (15 credits = 300 credits)',
      '10 × 45-min mock interviews (22 credits = 220 credits)',
      '10 LSRW sessions (8 credits each = 80 credits)',
      '1,000+ voice minutes/month (ElevenLabs TTS/STT)',
      '25,000+ emails/month (Brevo transactional + campaigns)',
      '100 GB storage',
      'Unlimited Resume ATS checks (3 credits each)',
      'Unlimited Airtable + Calendly integrations',
      'Bulk candidate import & placement drive management',
      'Dedicated success manager',
      'Custom interview scenarios + question banks',
      'Certificate of completion',
      'SLA 99.9% uptime guarantee',
      'Priority phone support (1h SLA)',
      'Overage: ₹3/credit — buy extra credits anytime',
    ],
    usageAllowance: { ai: '1,000 AI interactions', voice: '1,000+ voice min', emails: '25,000+ emails', storage: '100 GB' },
    limits: { interviews: 100, assessments: 'Unlimited', resumeChecks: 'Unlimited', sessions: 100 },
  },
];

const creditAddons: CreditAddon[] = [
  { id: 'addon-50', credits: 50, price: 249, bonus: 0 },
  { id: 'addon-150', credits: 150, price: 599, bonus: 10, popular: true },
  { id: 'addon-350', credits: 350, price: 1199, bonus: 30 },
  { id: 'addon-700', credits: 700, price: 1999, bonus: 80 },
];

function ScriptLoader({ onLoad }: { onLoad: () => void }) {
  return <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={onLoad} strategy="afterInteractive" />;
}

export default function PricingContent() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'addons' | 'orders'>('plans');
  const [showCreditRules, setShowCreditRules] = useState(false);

  const getPrice = (plan: Plan) => billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + item.qty } : c);
      return [...prev, item];
    });
    setCartOpen(true);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const handleCheckout = async () => {
    if (!scriptLoaded || processing || cart.length === 0) return;
    setProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: cartTotal, currency: 'INR', receipt: `triveda_${Date.now()}` }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Order creation failed');

      const cartSummary = cart.map(c => c.name).join(', ');
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Triveda AI Interview Platform',
        description: cartSummary,
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              const record: OrderRecord = {
                orderId: verifyData.orderId,
                paymentId: verifyData.paymentId,
                planName: cartSummary,
                amount: cartTotal,
                status: 'success',
                timestamp: new Date().toISOString(),
              };
              trackEvent('plan_upgrade', { plan_name: cartSummary, value: cartTotal, currency: 'INR', order_id: verifyData.orderId });
              setOrderHistory(prev => [record, ...prev]);
              setCart([]);
              setCartOpen(false);
              setSuccessMsg(`Payment successful! Order ID: ${verifyData.orderId}`);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err: any) {
            setErrorMsg(err.message || 'Verification failed');
          }
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#7C3AED' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <ScriptLoader onLoad={() => setScriptLoaded(true)} />
      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#F0F4FF]">
        {/* Header */}
        <div className="text-center pt-14 pb-8 px-4">
          <h1 className="text-4xl font-900 text-[#0D1B3E] mb-3 leading-tight">
            Simple, credit-based pricing
          </h1>
          <p className="text-base text-[#6B7A99] max-w-xl mx-auto mb-4">
            Each plan gives you a fixed monthly credit allowance. Credits are consumed strictly per action — no vague limits, no surprises.
          </p>

          {/* Credit Rules Toggle */}
          <button
            onClick={() => setShowCreditRules(!showCreditRules)}
            className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 mb-4 hover:bg-indigo-100 transition-colors"
          >
            <Coins size={14} className="text-indigo-600" />
            <span className="text-xs font-600 text-indigo-700">How credits are consumed</span>
            <ChevronDown size={12} className={`text-indigo-500 transition-transform ${showCreditRules ? 'rotate-180' : ''}`} />
          </button>

          {showCreditRules && (
            <div className="max-w-xl mx-auto mb-5 bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden text-left">
              <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <Coins size={15} className="text-indigo-600" />
                  <span className="text-sm font-700 text-indigo-800">Credit Consumption Rules</span>
                </div>
                <button onClick={() => setShowCreditRules(false)} className="text-indigo-400 hover:text-indigo-600">
                  <X size={14} />
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {CREDIT_RULES.map((rule, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-2">
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

        {/* Cart Button */}
        {cartCount > 0 && (
          <div className="fixed top-4 right-4 z-50">
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 bg-[#0D1B3E] text-white px-4 py-2.5 rounded-xl shadow-lg font-700 text-sm hover:bg-[#1a2f5e] transition-colors"
            >
              <ShoppingCart size={16} />
              Cart ({cartCount}) · ₹{cartTotal.toLocaleString('en-IN')}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 mb-6">
          <div className="inline-flex bg-[#F4F6FA] rounded-2xl p-1 gap-1">
            {(['plans', 'addons', 'orders'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-sm font-700 capitalize transition-all ${activeTab === tab ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99]'}`}
              >
                {tab === 'addons' ? 'Credit Packs' : tab === 'orders' ? 'Order History' : 'Plans'}
              </button>
            ))}
          </div>
        </div>

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="max-w-6xl mx-auto px-4 pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((plan) => {
                const price = getPrice(plan);
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border-2 ${plan.bgColor} ${plan.borderColor} p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow ${plan.popular ? 'ring-2 ring-violet-400 ring-offset-2' : ''}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-violet-600 text-white text-xs font-700 px-3 py-1 rounded-full shadow">Most Popular</span>
                      </div>
                    )}

                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {plan.icon}
                        <span className={`font-800 text-lg ${plan.color}`}>{plan.name}</span>
                      </div>
                      <p className="text-xs text-[#6B7A99] leading-relaxed">{plan.description}</p>
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
                    <div className={`rounded-xl border px-3 py-2.5 ${plan.bgColor} ${plan.borderColor}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Coins size={13} className="text-indigo-600" />
                          <span className="text-xs font-700 text-[#0D1B3E]">{plan.credits} credits/month</span>
                        </div>
                        <span className="text-xs font-600 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{plan.sessionsLabel}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Overage: {plan.overageRate}</p>
                    </div>

                    {/* Features */}
                    <ul className="flex flex-col gap-1.5 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-xs text-[#374151] leading-relaxed">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {price === 0 ? (
                      <button className="w-full py-2.5 rounded-xl text-sm font-700 bg-slate-700 hover:bg-slate-800 text-white transition-colors">
                        Start Free
                      </button>
                    ) : (
                      <button
                        onClick={() => addToCart({ type: 'plan', id: plan.id, name: `${plan.name} Plan (${billing})`, price, qty: 1 })}
                        className={`w-full py-2.5 rounded-xl text-sm font-700 transition-colors ${plan.popular ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-[#0D1B3E] hover:bg-[#1a2f5e] text-white'}`}
                      >
                        Get {plan.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Credit Breakdown Table */}
            <div className="mt-10 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                      { action: 'Voice add-on (TTS)', credits: 5, free: '—', starter: '+5/session', growth: '+5/session', pro: '+5/session' },
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
        )}

        {/* Credit Packs Tab */}
        {activeTab === 'addons' && (
          <div className="max-w-4xl mx-auto px-4 pb-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-800 text-[#0D1B3E] mb-2">Credit Top-Up Packs</h2>
              <p className="text-sm text-[#6B7A99]">Buy extra credits at a discount. Credits never expire within your subscription period.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {creditAddons.map((addon) => (
                <div
                  key={addon.id}
                  className={`relative rounded-2xl border-2 p-5 text-center ${addon.popular ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white'}`}
                >
                  {addon.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-violet-600 text-white text-[10px] font-700 px-2 py-0.5 rounded-full">Best Value</span>
                    </div>
                  )}
                  <div className="text-2xl font-900 text-[#0D1B3E] mb-1">{addon.credits} credits</div>
                  {addon.bonus > 0 && (
                    <div className="text-xs text-emerald-600 font-600 mb-2">+{addon.bonus} bonus credits</div>
                  )}
                  <div className="text-xl font-800 text-[#0D1B3E] mb-1">₹{addon.price.toLocaleString('en-IN')}</div>
                  <div className="text-xs text-slate-500 mb-3">₹{(addon.price / (addon.credits + addon.bonus)).toFixed(1)}/credit</div>
                  <button
                    onClick={() => addToCart({ type: 'addon', id: addon.id, name: `${addon.credits + addon.bonus} Credits Pack`, price: addon.price, qty: 1 })}
                    className={`w-full py-2 rounded-xl text-xs font-700 transition-colors ${addon.popular ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-[#0D1B3E] hover:bg-[#1a2f5e] text-white'}`}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="max-w-3xl mx-auto px-4 pb-10">
            {orderHistory.length === 0 ? (
              <div className="text-center py-16 text-[#6B7A99]">
                <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No orders yet. Purchase a plan or credit pack to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderHistory.map((order, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm font-700 text-[#0D1B3E]">{order.planName}</p>
                      <p className="text-xs text-slate-400">Order: {order.orderId} · {new Date(order.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-700 text-[#0D1B3E]">₹{order.amount.toLocaleString('en-IN')}</p>
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${order.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cart Drawer */}
        {cartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setCartOpen(false)} />
            <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-[#0D1B3E]" />
                  <span className="font-800 text-[#0D1B3E]">Cart ({cartCount})</span>
                </div>
                <button onClick={() => setCartOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <div className="flex-1">
                      <p className="text-sm font-700 text-[#0D1B3E]">{item.name}</p>
                      <p className="text-xs text-slate-500">₹{item.price.toLocaleString('en-IN')} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center">
                        <Minus size={10} />
                      </button>
                      <span className="text-sm font-700 w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center">
                        <Plus size={10} />
                      </button>
                      <button onClick={() => removeFromCart(item.id)} className="ml-1 text-red-400 hover:text-red-600">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5 border-t border-slate-100">
                {successMsg && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <p className="text-xs text-emerald-700">{successMsg}</p>
                  </div>
                )}
                {errorMsg && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                    <AlertCircle size={14} className="text-red-600" />
                    <p className="text-xs text-red-700">{errorMsg}</p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-700 text-[#0D1B3E]">Total</span>
                  <span className="text-lg font-900 text-[#0D1B3E]">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={processing || !scriptLoaded}
                  className="w-full py-3 bg-[#0D9488] hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl font-700 text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <Lock size={14} />}
                  {processing ? 'Processing...' : 'Pay Securely'}
                </button>
                <p className="text-xs text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                  <Shield size={10} /> Secured by Razorpay
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
