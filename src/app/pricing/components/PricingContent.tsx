'use client';
import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import {
  Check, Zap, Crown, Star, Sparkles, Plus, Minus, ShoppingCart, X, ChevronRight,
  Shield, Clock, CreditCard, AlertCircle, CheckCircle2, Loader2, Lock, Mic, FileText, TrendingUp, Info
} from 'lucide-react';
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
  usageAllowance: { ai: string; voice: string; emails: string; storage: string };
  overage: string;
  limits: { interviews: number | string; assessments: number | string; resumeChecks: number | string; sessions: number | string };
}

interface CreditAddon {
  id: string;
  sessions: number;
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

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Get started with AI interview practice',
    infraReserve: 'Shared infrastructure',
    color: 'text-slate-600',
    accentColor: '#64748B',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    badgeColor: 'bg-slate-100 text-slate-600',
    icon: <Star size={20} className="text-slate-500" />,
    features: [
      '3 AI mock interviews/month',
      '2 AI improvement tips per session',
      'Basic Communication score',
      'Interview history (last 5)',
      'Community support',
    ],
    usageAllowance: { ai: '3 AI interactions', voice: '5 voice min', emails: '50 emails', storage: '500 MB' },
    overage: 'Upgrade required',
    limits: { interviews: 3, assessments: 5, resumeChecks: 1, sessions: 3 },
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 999,
    annualPrice: 799,
    description: 'Full AI coaching for serious candidates. ~$175/mo infra reserve.',
    infraReserve: '~$175/mo infra reserve',
    color: 'text-blue-700',
    accentColor: '#2563EB',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    badgeColor: 'bg-blue-100 text-blue-700',
    icon: <Zap size={20} className="text-blue-600" />,
    features: [
      '100 AI interactions/month (mock interviews + Q&A)',
      '30 voice minutes/month (ElevenLabs TTS/STT)',
      '500 emails/month (Brevo transactional)',
      '5 GB storage',
      '5 Resume ATS checks/month',
      '1 Airtable integration, 1 Calendly connection',
      'Communication + Clarity + Domain scores',
      'Answer improvement suggestions',
      'Email support (48h SLA)',
      'Overage: ₹15/extra AI interaction, ₹2/extra voice min',
    ],
    usageAllowance: { ai: '100 AI interactions', voice: '30 voice min', emails: '500 emails', storage: '5 GB' },
    overage: '₹15/extra AI interaction · ₹2/extra voice min',
    limits: { interviews: 100, assessments: 50, resumeChecks: 5, sessions: 100 },
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 2499,
    annualPrice: 1999,
    description: 'Unlimited practice with advanced analytics. ~$350/mo infra reserve.',
    infraReserve: '~$350/mo infra reserve',
    color: 'text-violet-700',
    accentColor: '#7C3AED',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-400',
    badgeColor: 'bg-violet-100 text-violet-700',
    icon: <Sparkles size={20} className="text-violet-600" />,
    popular: true,
    features: [
      '500 AI interactions/month (mock interviews, coaching, Q&A)',
      '300 voice minutes/month (ElevenLabs TTS/STT)',
      '5,000 emails/month (Brevo transactional + marketing)',
      '25 GB storage',
      'Unlimited Resume ATS checks',
      'Multiple Airtable + Calendly integrations',
      'Full per-answer AI coaching + model answer library',
      'Company-specific prep packs',
      'Progress analytics dashboard',
      'Priority support (12h SLA)',
      'Live recruiter interview access',
      'Overage: ₹12/extra AI interaction, ₹1.5/extra voice min',
    ],
    usageAllowance: { ai: '500 AI interactions', voice: '300 voice min', emails: '5,000 emails', storage: '25 GB' },
    overage: '₹12/extra AI interaction · ₹1.5/extra voice min',
    limits: { interviews: 500, assessments: 'Unlimited', resumeChecks: 'Unlimited', sessions: 500 },
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 4999,
    annualPrice: 3999,
    description: 'For placement-focused institutions & large teams. ~$600/mo infra reserve.',
    infraReserve: '~$600/mo infra reserve',
    color: 'text-amber-700',
    accentColor: '#D97706',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    badgeColor: 'bg-amber-100 text-amber-700',
    icon: <Crown size={20} className="text-amber-600" />,
    features: [
      '2,000+ AI interactions/month (interviews, evaluation, agents)',
      '1,000+ voice minutes/month (ElevenLabs TTS/STT)',
      '25,000+ emails/month (Brevo transactional + campaigns)',
      '100 GB storage',
      'Unlimited Resume ATS checks',
      'Unlimited Airtable + Calendly integrations',
      'Bulk candidate import & placement drive management',
      'Dedicated success manager',
      'Custom interview scenarios + question banks',
      'Certificate of completion',
      'SLA 99.9% uptime guarantee',
      'Priority phone support (1h SLA)',
      'Overage: ₹10/extra AI interaction, ₹1/extra voice min',
    ],
    usageAllowance: { ai: '2,000+ AI interactions', voice: '1,000+ voice min', emails: '25,000+ emails', storage: '100 GB' },
    overage: '₹10/extra AI interaction · ₹1/extra voice min',
    limits: { interviews: 2000, assessments: 'Unlimited', resumeChecks: 'Unlimited', sessions: 2000 },
  },
];

const creditAddons: CreditAddon[] = [
  { id: 'addon-5', sessions: 5, price: 299, bonus: 0 },
  { id: 'addon-15', sessions: 15, price: 749, bonus: 2, popular: true },
  { id: 'addon-30', sessions: 30, price: 1299, bonus: 5 },
  { id: 'addon-60', sessions: 60, price: 2199, bonus: 12 },
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
              const record: OrderRecord = { orderId: verifyData.orderId, paymentId: verifyData.paymentId, planName: cartSummary, amount: cartTotal, status: 'success', timestamp: new Date().toISOString() };
              trackEvent('plan_upgrade', { plan_name: cartSummary, value: cartTotal, currency: 'INR', order_id: verifyData.orderId });
              setOrderHistory(prev => [record, ...prev]);
              setCart([]);
              setCartOpen(false);
              setSuccessMsg(`Payment successful! Order ID: ${verifyData.orderId}`);
              setTimeout(() => setSuccessMsg(null), 6000);
            } else {
              setErrorMsg('Payment verification failed. Contact support.');
            }
          } catch {
            setErrorMsg('Verification error. Please contact support.');
          }
          setProcessing(false);
        },
        modal: { ondismiss: () => setProcessing(false) },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#0D9488' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (res: any) => {
        const record: OrderRecord = { orderId: data.orderId, paymentId: '', planName: cartSummary, amount: cartTotal, status: 'failed', timestamp: new Date().toISOString() };
        setOrderHistory(prev => [record, ...prev]);
        setErrorMsg(`Payment failed: ${res.error.description}`);
        setProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <>
      <ScriptLoader onLoad={() => setScriptLoaded(true)} />

      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Plans & Pricing</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Each plan includes a fixed monthly allowance of AI interactions, voice minutes, emails, and storage. Overage billed at plan rate.</p>
          </div>
          <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 bg-[#0D9488] hover:bg-[#0B8076] text-white font-700 text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm">
            <ShoppingCart size={16} />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-amber-400 text-[#0D1B3E] text-[10px] font-800 rounded-full flex items-center justify-center">{cartCount}</span>
            )}
          </button>
        </div>

        {/* Infrastructure note */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <strong>Pricing reflects real infrastructure costs:</strong> OpenAI/Groq AI APIs, ElevenLabs voice (TTS/STT), Supabase database, Railway hosting, Brevo email, Airtable, and Calendly.
            Razorpay payment processing is variable: <strong>2% + GST per successful transaction</strong> (not included in plan price).
          </div>
        </div>

        {/* Success / Error banners */}
        {successMsg && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <p className="text-sm font-600 text-emerald-800">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto"><X size={16} className="text-emerald-500" /></button>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm font-600 text-red-800">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="ml-auto"><X size={16} className="text-red-500" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#E8ECF4]">
          {[
            { id: 'plans' as const, label: 'Subscription Plans' },
            { id: 'addons' as const, label: 'Session Credit Add-ons' },
            { id: 'orders' as const, label: `Order History${orderHistory.length > 0 ? ` (${orderHistory.length})` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={['px-5 py-3 text-sm font-600 border-b-2 transition-all -mb-px',
                activeTab === t.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'].join(' ')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PLANS TAB ── */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-600 ${billing === 'monthly' ? 'text-[#0D1B3E]' : 'text-[#6B7A99]'}`}>Monthly</span>
              <button onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
                className={`relative w-12 h-6 rounded-full transition-colors ${billing === 'annual' ? 'bg-[#0D9488]' : 'bg-[#E8ECF4]'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === 'annual' ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-600 ${billing === 'annual' ? 'text-[#0D1B3E]' : 'text-[#6B7A99]'}`}>
                Annual
                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-700 rounded-full">Save 20%</span>
              </span>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {plans.map((plan) => {
                const price = getPrice(plan);
                const inCart = cart.some(c => c.id === plan.id);
                return (
                  <div key={plan.id} className={`relative bg-white rounded-2xl border-2 ${plan.popular ? 'border-violet-400 shadow-lg shadow-violet-100' : plan.borderColor} overflow-hidden flex flex-col`}>
                    {plan.popular && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />}
                    {plan.popular && (
                      <div className="absolute top-4 right-4">
                        <span className="px-2.5 py-1 bg-violet-600 text-white text-[10px] font-800 rounded-full">MOST POPULAR</span>
                      </div>
                    )}
                    <div className={`p-5 ${plan.bgColor}`}>
                      <div className={`w-10 h-10 rounded-xl bg-white border ${plan.borderColor} flex items-center justify-center mb-3`}>
                        {plan.icon}
                      </div>
                      <h3 className={`text-lg font-800 ${plan.color}`}>{plan.name}</h3>
                      <p className="text-xs text-[#6B7A99] mt-0.5 leading-snug">{plan.description}</p>
                      <div className="mt-4">
                        {price === 0 ? (
                          <p className="text-3xl font-800 text-[#0D1B3E]">Free</p>
                        ) : (
                          <div className="flex items-end gap-1">
                            <p className="text-3xl font-800 text-[#0D1B3E]">₹{price.toLocaleString()}</p>
                            <p className="text-sm text-[#6B7A99] mb-1">/mo</p>
                          </div>
                        )}
                        {billing === 'annual' && price > 0 && (
                          <p className="text-xs text-emerald-600 font-600 mt-0.5">₹{(price * 12).toLocaleString()} billed annually</p>
                        )}
                      </div>
                    </div>

                    {/* Usage allowance summary */}
                    {plan.id !== 'free' && (
                      <div className="px-5 pt-4 pb-2">
                        <p className="text-[10px] font-800 text-[#0D9488] uppercase tracking-wider mb-2">Included Monthly Allowance</p>
                        <div className="space-y-1">
                          {[
                            { icon: <Sparkles size={10} className="text-violet-500" />, label: plan.usageAllowance.ai },
                            { icon: <Mic size={10} className="text-blue-500" />, label: plan.usageAllowance.voice },
                            { icon: <FileText size={10} className="text-amber-500" />, label: plan.usageAllowance.emails },
                            { icon: <TrendingUp size={10} className="text-teal-500" />, label: plan.usageAllowance.storage },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              {item.icon}
                              <span className="text-[11px] text-[#4B5563]">{item.label}</span>
                            </div>
                          ))}
                        </div>
                        {plan.overage !== 'Upgrade required' && (
                          <p className="text-[10px] text-[#9BA8C0] mt-2 border-t border-[#E8ECF4] pt-2">Overage: {plan.overage}</p>
                        )}
                      </div>
                    )}

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="space-y-2.5 flex-1">
                        {plan.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span className="text-xs text-[#4B5563] leading-snug">{f}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5">
                        {plan.id === 'free' ? (
                          <button className="w-full py-2.5 rounded-xl border-2 border-[#E8ECF4] text-sm font-700 text-[#6B7A99] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors">
                            Current Plan
                          </button>
                        ) : inCart ? (
                          <button onClick={() => removeFromCart(plan.id)} className="w-full py-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-sm font-700 text-emerald-700 flex items-center justify-center gap-2">
                            <CheckCircle2 size={15} />Added to Cart
                          </button>
                        ) : (
                          <button
                            onClick={() => addToCart({ type: 'plan', id: plan.id, name: `${plan.name} Plan (${billing})`, price, qty: 1 })}
                            className="w-full py-2.5 rounded-xl text-sm font-700 text-white transition-colors flex items-center justify-center gap-2"
                            style={{ background: plan.accentColor }}
                          >
                            <ShoppingCart size={14} />
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-8 flex-wrap py-2">
              {[
                { icon: <Shield size={15} className="text-[#0D9488]" />, label: 'Secure Razorpay Checkout (2% + GST per txn)' },
                { icon: <Clock size={15} className="text-[#0D9488]" />, label: 'Cancel anytime' },
                { icon: <CreditCard size={15} className="text-[#0D9488]" />, label: 'UPI, Cards, Net Banking' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#6B7A99]">{b.icon}{b.label}</div>
              ))}
            </div>
          </div>
        )}

        {/* ── ADD-ONS TAB ── */}
        {activeTab === 'addons' && (
          <div className="space-y-5">
            <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl p-4">
              <p className="text-sm text-[#6B7A99]">Session credits let you run additional AI mock interviews beyond your plan's included allowance. 1 credit = 1 complete AI interview session. Credits never expire and can be used anytime.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {creditAddons.map((addon) => {
                const cartItem = cart.find(c => c.id === addon.id);
                return (
                  <div key={addon.id} className={`relative bg-white border-2 rounded-2xl p-5 flex flex-col gap-4 ${addon.popular ? 'border-[#0D9488] shadow-md shadow-teal-100' : 'border-[#E8ECF4]'}`}>
                    {addon.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#0D9488] text-white text-[10px] font-800 rounded-full">BEST VALUE</span>
                    )}
                    <div>
                      <p className="text-2xl font-800 text-[#0D1B3E]">{addon.sessions} <span className="text-base font-600 text-[#6B7A99]">sessions</span></p>
                      {addon.bonus > 0 && <p className="text-xs text-emerald-600 font-700 mt-0.5">+{addon.bonus} bonus sessions free</p>}
                    </div>
                    <p className="text-xl font-800 text-[#0D9488]">₹{addon.price.toLocaleString()}</p>
                    <p className="text-xs text-[#6B7A99]">₹{Math.round(addon.price / (addon.sessions + addon.bonus))} per session</p>
                    {cartItem ? (
                      <div className="flex items-center justify-between border border-[#E8ECF4] rounded-lg p-1">
                        <button onClick={() => updateQty(addon.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#F4F6FA] rounded-md transition-colors"><Minus size={14} /></button>
                        <span className="text-sm font-700 text-[#0D1B3E]">{cartItem.qty}</span>
                        <button onClick={() => updateQty(addon.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#F4F6FA] rounded-md transition-colors"><Plus size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart({ type: 'addon', id: addon.id, name: `${addon.sessions + addon.bonus} Session Credits`, price: addon.price, qty: 1 })}
                        className="w-full py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0B8076] text-white text-sm font-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={14} />Add to Cart
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ORDER HISTORY TAB ── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orderHistory.length === 0 ? (
              <div className="bg-white border border-[#E8ECF4] rounded-xl p-12 text-center">
                <CreditCard size={40} className="text-[#E8ECF4] mx-auto mb-3" />
                <p className="text-sm font-600 text-[#0D1B3E]">No orders yet</p>
                <p className="text-xs text-[#6B7A99] mt-1">Your payment history will appear here after checkout.</p>
              </div>
            ) : (
              orderHistory.map((order, i) => (
                <div key={i} className="bg-white border border-[#E8ECF4] rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${order.status === 'success' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {order.status === 'success' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-red-500" />}
                    </div>
                    <div>
                      <p className="font-700 text-[#0D1B3E] text-sm">{order.planName}</p>
                      <p className="text-xs text-[#6B7A99] mt-0.5">Order: {order.orderId}</p>
                      {order.paymentId && <p className="text-xs text-[#6B7A99]">Payment: {order.paymentId}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-800 text-[#0D1B3E]">₹{order.amount.toLocaleString()}</p>
                    <p className={`text-xs font-600 mt-0.5 ${order.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {order.status === 'success' ? 'Payment Successful' : 'Payment Failed'}
                    </p>
                    <p className="text-[10px] text-[#6B7A99] mt-0.5">{new Date(order.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#E8ECF4]">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#0D9488]" />
                <h2 className="font-800 text-[#0D1B3E]">Your Cart</h2>
                {cartCount > 0 && <span className="px-2 py-0.5 bg-[#0D9488] text-white text-xs font-700 rounded-full">{cartCount}</span>}
              </div>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 flex items-center justify-center hover:bg-[#F4F6FA] rounded-lg transition-colors">
                <X size={18} className="text-[#6B7A99]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={36} className="text-[#E8ECF4] mx-auto mb-3" />
                  <p className="text-sm text-[#6B7A99]">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-4 bg-[#F8FAFC] rounded-xl border border-[#E8ECF4]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-700 text-[#0D1B3E] truncate">{item.name}</p>
                      <p className="text-xs text-[#6B7A99] mt-0.5">₹{item.price.toLocaleString()} × {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.type === 'addon' && (
                        <div className="flex items-center gap-1 border border-[#E8ECF4] rounded-lg">
                          <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#F4F6FA] rounded-l-lg transition-colors"><Minus size={12} /></button>
                          <span className="text-xs font-700 text-[#0D1B3E] px-1">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#F4F6FA] rounded-r-lg transition-colors"><Plus size={12} /></button>
                        </div>
                      )}
                      <p className="text-sm font-800 text-[#0D1B3E]">₹{(item.price * item.qty).toLocaleString()}</p>
                      <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors">
                        <X size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-[#E8ECF4] space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#6B7A99]">Subtotal</p>
                  <p className="text-lg font-800 text-[#0D1B3E]">₹{cartTotal.toLocaleString()}</p>
                </div>
                <p className="text-[10px] text-[#9BA8C0]">+ Razorpay processing: 2% + GST on successful payment</p>
                <div className="flex items-center gap-2 p-3 bg-[#F8FAFC] rounded-lg border border-[#E8ECF4]">
                  <Lock size={12} className="text-[#6B7A99]" />
                  <p className="text-xs text-[#6B7A99]">Secured by Razorpay. UPI, Cards, Net Banking accepted.</p>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={processing || !scriptLoaded}
                  className="w-full py-3.5 rounded-xl bg-[#0D9488] hover:bg-[#0B8076] disabled:opacity-60 text-white font-800 text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {processing ? (
                    <><Loader2 size={16} className="animate-spin" />Processing...</>
                  ) : (
                    <><CreditCard size={16} />Pay ₹{cartTotal.toLocaleString()}<ChevronRight size={16} /></>
                  )}
                </button>
                {!scriptLoaded && <p className="text-xs text-center text-[#6B7A99]">Loading payment gateway...</p>}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[10px] font-700 text-amber-700 mb-1">Test Mode — Use test card:</p>
                  <p className="text-[10px] text-amber-700 font-mono">4100 2800 0000 1007 · 12/35 · 123</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
