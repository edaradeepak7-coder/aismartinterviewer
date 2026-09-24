'use client';
import React, { useState } from 'react';
import Script from 'next/script';
import { Check, Zap, Crown, Star, Sparkles, Plus, Minus, ShoppingCart, X, Shield, AlertCircle, CheckCircle2, Loader2, Lock, Coins, ChevronDown, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import { csrfHeaders } from '@/lib/api/apiClient';
import {
  BILLING_PLANS,
  CREDIT_ADDONS,
  PRICING_PAGE_ADDON_IDS,
  getPlanChargeInr,
  getAnnualMonthlyEquivalent,
  formatOverageRate,
  type BillingPlan,
} from '@/lib/billing/plans';
import { CREDIT_COSTS, OPERATION_LABELS } from '@/lib/hooks/useCreditBalance';

interface PlanView {
  id: string;
  name: string;
  description: string;
  color: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  icon: React.ReactNode;
  popular?: boolean;
  features: string[];
  catalog: BillingPlan;
}

interface CreditAddonView {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  price: number;
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

/** Live debit costs — same source as CreditCheckModal / interview flows */
const CREDIT_RULES = [
  { action: OPERATION_LABELS.mockInterview20, credits: CREDIT_COSTS.mockInterview20 },
  { action: OPERATION_LABELS.mockInterview30, credits: CREDIT_COSTS.mockInterview30 },
  { action: OPERATION_LABELS.mockInterview45, credits: CREDIT_COSTS.mockInterview45 },
  { action: OPERATION_LABELS.mockInterview60, credits: CREDIT_COSTS.mockInterview60 },
  { action: OPERATION_LABELS.aiInterview, credits: CREDIT_COSTS.aiInterview },
  { action: OPERATION_LABELS.lsrwSession, credits: CREDIT_COSTS.lsrwSession },
  { action: OPERATION_LABELS.codingAssessment, credits: CREDIT_COSTS.codingAssessment },
  { action: OPERATION_LABELS.resumeAnalysis, credits: CREDIT_COSTS.resumeAnalysis },
  { action: OPERATION_LABELS.resumeBuilder, credits: CREDIT_COSTS.resumeBuilder },
  { action: OPERATION_LABELS.atsScoring, credits: CREDIT_COSTS.atsScoring },
  { action: OPERATION_LABELS.premiumAssessment, credits: CREDIT_COSTS.premiumAssessment },
] as const;

const PLAN_UI: Record<string, Omit<PlanView, 'id' | 'name' | 'catalog'>> = {
  free: {
    description: 'Try AI interview practice — no card required',
    color: 'text-slate-600',
    accentColor: '#64748B',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    badgeColor: 'bg-slate-100 text-slate-600',
    icon: <Star size={20} className="text-slate-500" />,
    features: [
      'Monthly credit allowance from catalog',
      `${CREDIT_COSTS.mockInterview20} credits per 20-min mock interview`,
      'Basic interview history',
      'Community support',
      'Upgrade anytime for more credits',
    ],
  },
  starter: {
    description: 'Full AI coaching for serious candidates.',
    color: 'text-blue-700',
    accentColor: '#2563EB',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    badgeColor: 'bg-blue-100 text-blue-700',
    icon: <Zap size={20} className="text-blue-600" />,
    features: [
      'Monthly credit allowance from catalog',
      'Mock interviews, ATS checks, and LSRW at published credit rates',
      'Email support',
      'Buy credit packs anytime',
    ],
  },
  growth: {
    description: 'Serious prep with analytics & coaching.',
    color: 'text-violet-700',
    accentColor: '#7C3AED',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-400',
    badgeColor: 'bg-violet-100 text-violet-700',
    icon: <Sparkles size={20} className="text-violet-600" />,
    popular: true,
    features: [
      'Larger monthly credit allowance',
      'All Starter features',
      'Priority support',
      'Overage credits available at plan rate',
    ],
  },
  pro: {
    description: 'Maximum prep power for placement-focused candidates.',
    color: 'text-amber-700',
    accentColor: '#D97706',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    badgeColor: 'bg-amber-100 text-amber-700',
    icon: <Crown size={20} className="text-amber-600" />,
    features: [
      'Largest monthly credit allowance',
      'All Growth features',
      'Lowest overage rate',
      'Priority support',
    ],
  },
};

const plans: PlanView[] = BILLING_PLANS.map((catalog) => {
  const ui = PLAN_UI[catalog.id] ?? PLAN_UI.free;
  return {
    id: catalog.id,
    name: catalog.name,
    catalog,
    ...ui,
    features: [
      `${catalog.credits.toLocaleString('en-IN')} credits/month`,
      `Up to ${Math.floor(catalog.credits / CREDIT_COSTS.mockInterview20)} × 20-min mocks (${CREDIT_COSTS.mockInterview20} cr each)`,
      `Overage: ${formatOverageRate(catalog.overagePaise)}`,
      ...ui.features.filter((f) => !f.startsWith('Monthly credit') && !f.startsWith('Larger monthly') && !f.startsWith('Largest monthly')),
    ],
  };
});

const creditAddons: CreditAddonView[] = PRICING_PAGE_ADDON_IDS.map((id, index) => {
  const addon = CREDIT_ADDONS[id];
  const bonus = addon.bonusCredits ?? 0;
  return {
    id,
    name: addon.name,
    credits: addon.credits - bonus,
    bonus,
    price: addon.priceInr,
    popular: index === 1,
  };
});

const CAPACITY_ACTIONS: { action: string; credits: number }[] = [
  { action: OPERATION_LABELS.mockInterview20, credits: CREDIT_COSTS.mockInterview20 },
  { action: OPERATION_LABELS.mockInterview30, credits: CREDIT_COSTS.mockInterview30 },
  { action: OPERATION_LABELS.mockInterview45, credits: CREDIT_COSTS.mockInterview45 },
  { action: OPERATION_LABELS.mockInterview60, credits: CREDIT_COSTS.mockInterview60 },
  { action: OPERATION_LABELS.lsrwSession, credits: CREDIT_COSTS.lsrwSession },
  { action: OPERATION_LABELS.codingAssessment, credits: CREDIT_COSTS.codingAssessment },
  { action: OPERATION_LABELS.resumeAnalysis, credits: CREDIT_COSTS.resumeAnalysis },
  { action: OPERATION_LABELS.atsScoring, credits: CREDIT_COSTS.atsScoring },
];

function capacityFor(planCredits: number, cost: number): string {
  if (cost <= 0) return '—';
  return String(Math.floor(planCredits / cost));
}

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

  const getDisplayPrice = (plan: PlanView) =>
    billing === 'annual' ? getAnnualMonthlyEquivalent(plan.catalog) : plan.catalog.priceInr;
  const getCheckoutPrice = (plan: PlanView) => getPlanChargeInr(plan.catalog, billing);

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
      const primary = cart[0];
      const isAddon = primary.type === 'addon';
      const orderBody = isAddon
        ? {
            addonId: primary.id,
            amount: cartTotal,
            currency: 'INR',
            receipt: `addon_${Date.now()}`,
          }
        : {
            planId: primary.id,
            amount: primary.price,
            currency: 'INR',
            billingCycle: billing,
            receipt: `plan_${primary.id}_${Date.now()}`,
          };

      const res = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(orderBody),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Order creation failed');

      const cartSummary = cart.map((c) => c.name).join(', ');
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'AI Interview Platform',
        description: cartSummary,
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: csrfHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({
                ...response,
                planId: isAddon ? undefined : primary.id,
                addonId: isAddon ? primary.id : undefined,
                planName: primary.name,
                priceInr: isAddon ? cartTotal : primary.price,
                credits: data.credits,
                billingCycle: billing,
              }),
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
              trackEvent('plan_upgrade', {
                plan_name: cartSummary,
                value: cartTotal,
                currency: 'INR',
                order_id: verifyData.orderId,
              });
              setOrderHistory((prev) => [record, ...prev]);
              setCart([]);
              setCartOpen(false);
              setSuccessMsg(`Payment successful! Credits activated. Order ID: ${verifyData.orderId}`);
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
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
                {CREDIT_RULES.map((rule) => (
                  <div key={rule.action} className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-sm text-[#0D1B3E] font-500">{rule.action}</span>
                    <span className="text-sm font-700 text-indigo-700 whitespace-nowrap ml-4">{rule.credits} credits</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700">
                  <strong>Example:</strong> A 30-min mock interview costs{' '}
                  <strong>{CREDIT_COSTS.mockInterview30} credits</strong> (same rate charged at session start).
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
          <>
          <div className="max-w-6xl mx-auto px-4 pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((plan) => {
                const displayPrice = getDisplayPrice(plan);
                const checkoutPrice = getCheckoutPrice(plan);
                const sessionsApprox = Math.floor(plan.catalog.credits / CREDIT_COSTS.mockInterview20);
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
                      {displayPrice === 0 ? (
                        <div className="text-3xl font-900 text-[#0D1B3E]">Free</div>
                      ) : (
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-900 text-[#0D1B3E]">₹{displayPrice.toLocaleString('en-IN')}</span>
                          <span className="text-sm text-[#6B7A99] mb-1">/mo</span>
                        </div>
                      )}
                      {billing === 'annual' && checkoutPrice > 0 && (
                        <p className="text-xs text-emerald-600 font-600 mt-0.5">
                          ₹{checkoutPrice.toLocaleString('en-IN')} billed yearly (20% off)
                        </p>
                      )}
                    </div>

                    {/* Credit Badge */}
                    <div className={`rounded-xl border px-3 py-2.5 ${plan.bgColor} ${plan.borderColor}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Coins size={13} className="text-indigo-600" />
                          <span className="text-xs font-700 text-[#0D1B3E]">{plan.catalog.credits} credits/month</span>
                        </div>
                        <span className="text-xs font-600 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">~{sessionsApprox} × 20-min</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Overage: {formatOverageRate(plan.catalog.overagePaise)}</p>
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
                    {checkoutPrice === 0 ? (
                      <button className="w-full py-2.5 rounded-xl text-sm font-700 bg-slate-700 hover:bg-slate-800 text-white transition-colors">
                        Start Free
                      </button>
                    ) : (
                      <button
                        onClick={() => addToCart({ type: 'plan', id: plan.id, name: `${plan.name} Plan (${billing})`, price: checkoutPrice, qty: 1 })}
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
                      <th className="text-center px-3 py-3 text-xs font-700 text-slate-500">Free ({BILLING_PLANS.find(p => p.id === 'free')!.credits})</th>
                      <th className="text-center px-3 py-3 text-xs font-700 text-blue-600">Starter ({BILLING_PLANS.find(p => p.id === 'starter')!.credits})</th>
                      <th className="text-center px-3 py-3 text-xs font-700 text-violet-600">Growth ({BILLING_PLANS.find(p => p.id === 'growth')!.credits})</th>
                      <th className="text-center px-3 py-3 text-xs font-700 text-amber-600">Pro ({BILLING_PLANS.find(p => p.id === 'pro')!.credits.toLocaleString('en-IN')})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {CAPACITY_ACTIONS.map((row) => {
                      const free = BILLING_PLANS.find((p) => p.id === 'free')!;
                      const starter = BILLING_PLANS.find((p) => p.id === 'starter')!;
                      const growth = BILLING_PLANS.find((p) => p.id === 'growth')!;
                      const pro = BILLING_PLANS.find((p) => p.id === 'pro')!;
                      return (
                        <tr key={row.action} className="hover:bg-slate-50/50">
                          <td className="px-5 py-2.5 text-xs text-[#374151] font-500">{row.action}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="text-xs font-700 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{row.credits}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-slate-500">{capacityFor(free.credits, row.credits)}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-blue-700 font-600">{capacityFor(starter.credits, row.credits)}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-violet-700 font-600">{capacityFor(growth.credits, row.credits)}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-amber-700 font-600">{capacityFor(pro.credits, row.credits)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-indigo-50 to-violet-50 border-t border-indigo-100">
                      <td className="px-5 py-3 text-xs font-700 text-[#0D1B3E]">Total credits/month</td>
                      <td className="px-3 py-3 text-center text-xs font-700 text-indigo-700">—</td>
                      <td className="px-3 py-3 text-center text-xs font-700 text-slate-600">{BILLING_PLANS.find(p => p.id === 'free')!.credits}</td>
                      <td className="px-3 py-3 text-center text-xs font-700 text-blue-700">{BILLING_PLANS.find(p => p.id === 'starter')!.credits}</td>
                      <td className="px-3 py-3 text-center text-xs font-700 text-violet-700">{BILLING_PLANS.find(p => p.id === 'growth')!.credits}</td>
                      <td className="px-3 py-3 text-center text-xs font-700 text-amber-700">{BILLING_PLANS.find(p => p.id === 'pro')!.credits.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-indigo-50 to-violet-50">
                      <td className="px-5 py-3 text-xs font-700 text-[#0D1B3E]">Overage rate</td>
                      <td className="px-3 py-3 text-center text-xs text-slate-400">—</td>
                      <td className="px-3 py-3 text-center text-xs text-slate-500">{formatOverageRate(BILLING_PLANS.find(p => p.id === 'free')!.overagePaise)}</td>
                      <td className="px-3 py-3 text-center text-xs text-blue-700 font-600">{formatOverageRate(BILLING_PLANS.find(p => p.id === 'starter')!.overagePaise)}</td>
                      <td className="px-3 py-3 text-center text-xs text-violet-700 font-600">{formatOverageRate(BILLING_PLANS.find(p => p.id === 'growth')!.overagePaise)}</td>
                      <td className="px-3 py-3 text-center text-xs text-amber-700 font-600">{formatOverageRate(BILLING_PLANS.find(p => p.id === 'pro')!.overagePaise)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 pb-12">
            <div className="bg-gradient-to-r from-[#0D1B3E] to-[#1a2f5e] rounded-2xl p-8 text-center text-white">
              <Building2 size={28} className="mx-auto mb-3 text-teal-400" />
              <h2 className="text-xl font-800 mb-2">Hiring at scale?</h2>
              <p className="text-slate-300 mb-5 text-sm max-w-lg mx-auto">
                Recruiter seat plans include session credits, team seats, and sales-backed enterprise options.
              </p>
              <Link
                href="/b2b-pricing"
                className="inline-flex items-center gap-2 bg-[#0D9488] hover:bg-teal-600 text-white px-6 py-3 rounded-xl font-700 text-sm transition-colors"
              >
                View B2B Plans <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          </>
        )}
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
                  <div className="text-2xl font-900 text-[#0D1B3E] mb-1">{addon.credits + addon.bonus} credits</div>
                  {addon.bonus > 0 && (
                    <div className="text-xs text-emerald-600 font-600 mb-2">{addon.credits} + {addon.bonus} bonus</div>
                  )}
                  <div className="text-xl font-800 text-[#0D1B3E] mb-1">₹{addon.price.toLocaleString('en-IN')}</div>
                  <div className="text-xs text-slate-500 mb-3">₹{(addon.price / (addon.credits + addon.bonus)).toFixed(1)}/credit</div>
                  <button
                    onClick={() => addToCart({ type: 'addon', id: addon.id, name: addon.name, price: addon.price, qty: 1 })}
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
                  <Shield size={10} /> Secured payment processing
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
