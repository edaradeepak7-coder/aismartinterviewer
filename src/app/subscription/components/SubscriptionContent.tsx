'use client';
import React, { useState, useEffect } from 'react';

import { Zap, TrendingUp, BarChart2, RefreshCw, CheckCircle2, Mic, FileText, ClipboardList, Download, Star } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  tier: 'Basic' | 'Pro' | 'Enterprise';
  monthlyCredits: number;
  price: number;
  billingCycle: 'monthly' | 'annual';
  renewalDate: string;
  features: string[];
  limits: {
    aiInterviews: number;
    assessments: number;
    resumeAnalysis: number;
    candidates: number;
    recruiters: number;
    institutions: number;
  };
}

interface CreditUsage {
  feature: string;
  icon: React.ReactNode;
  color: string;
  used: number;
  costPerOp: number;
  totalCost: number;
  trend: number;
}

interface TopUpPackage {
  id: string;
  credits: number;
  price: number;
  bonus: number;
  popular?: boolean;
}

// ─── Static plan data (used as fallback) ─────────────────────────────────────

const DEFAULT_PLAN: Plan = {
  id: 'business-001',
  name: 'Business',
  tier: 'Enterprise',
  monthlyCredits: 200000,
  price: 4999,
  billingCycle: 'annual',
  renewalDate: '2027-09-01',
  features: [
    '2,000+ AI interactions/month',
    '1,000+ voice minutes/month (AI voice)',
    '25,000+ emails/month',
    '100 GB storage',
    'Unlimited candidates',
    'Up to 50 recruiters',
    'Up to 10 institutions',
    'Priority AI model routing',
    'Dedicated support (1h SLA)',
    'Custom RBAC & SSO',
    'Advanced analytics',
    'SLA 99.9% uptime',
    'Overage: ₹10/extra AI interaction, ₹1/extra voice min',
  ],
  limits: {
    aiInterviews: 2000,
    assessments: 'Unlimited' as any,
    resumeAnalysis: 'Unlimited' as any,
    candidates: -1,
    recruiters: 50,
    institutions: 10,
  },
};

const topUpPackages: TopUpPackage[] = [
  { id: 'tp1', credits: 5_000, price: 149, bonus: 0 },
  { id: 'tp2', credits: 15_000, price: 399, bonus: 1_500, popular: true },
  { id: 'tp3', credits: 50_000, price: 1199, bonus: 7_500 },
  { id: 'tp4', credits: 100_000, price: 1999, bonus: 20_000 },
];

const allPlans = [
  {
    tier: 'Starter',
    price: 999,
    credits: 10_000,
    infraReserve: '~$175/mo',
    color: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    features: [
      '100 AI Interactions/mo',
      '30 Voice Minutes/mo (AI voice)',
      '500 Emails/mo',
      '5 GB Storage',
      '5 Resume ATS Checks',
      '1 data integration, 1 scheduling',
      'Overage: ₹15/AI · ₹2/voice min',
    ],
  },
  {
    tier: 'Professional',
    price: 2_499,
    credits: 50_000,
    infraReserve: '~$350/mo',
    color: 'border-violet-300',
    badge: 'bg-violet-50 text-violet-700',
    features: [
      '500 AI Interactions/mo',
      '300 Voice Minutes/mo (AI voice)',
      '5,000 Emails/mo',
      '25 GB Storage',
      'Unlimited Resume ATS Checks',
      'Multiple data + scheduling integrations',
      'Overage: ₹12/AI · ₹1.5/voice min',
    ],
  },
  {
    tier: 'Business',
    price: 4_999,
    credits: 200_000,
    infraReserve: '~$600/mo',
    color: 'border-amber-400',
    badge: 'bg-amber-50 text-amber-700',
    features: [
      '2,000+ AI Interactions/mo',
      '1,000+ Voice Minutes/mo (AI voice)',
      '25,000+ Emails/mo',
      '100 GB Storage',
      'Unlimited Resume ATS Checks',
      'Unlimited data + scheduling integrations',
      'Overage: ₹10/AI · ₹1/voice min',
    ],
    current: true,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-500 mb-0.5">{label}</p>
        <p className="text-xl font-700 text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CreditMeter({ used, total }: { used: number; total: number }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const color = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-teal-500';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span>{used.toLocaleString()} used</span>
        <span>{total.toLocaleString()} total</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-right text-xs text-slate-400 mt-1">{pct}% consumed</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubscriptionContent() {
  const [topUpQty, setTopUpQty] = useState<string | null>(null);
  const [confirmTopUp, setConfirmTopUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<Plan>(DEFAULT_PLAN);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [usageBreakdown, setUsageBreakdown] = useState<CreditUsage[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSubscription() {
      try {
        const res = await fetch('/api/subscription');
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        const sub = json?.data?.subscription;
        const usage = json?.data?.usage ?? [];

        if (sub) {
          const plan: Plan = {
            id: sub.id || 'enterprise-001',
            name: sub.plan_name || DEFAULT_PLAN.name,
            tier: (sub.tier || DEFAULT_PLAN.tier) as Plan['tier'],
            monthlyCredits: sub.credits_total || DEFAULT_PLAN.monthlyCredits,
            price: sub.price || DEFAULT_PLAN.price,
            billingCycle: sub.billing_cycle || DEFAULT_PLAN.billingCycle,
            renewalDate: sub.renewal_date || DEFAULT_PLAN.renewalDate,
            features: sub.features || DEFAULT_PLAN.features,
            limits: sub.limits || DEFAULT_PLAN.limits,
          };
          const used = (sub.credits_total || DEFAULT_PLAN.monthlyCredits) - (sub.credits_remaining || DEFAULT_PLAN.monthlyCredits);
          if (!cancelled) {
            setActivePlan(plan);
            setCreditsUsed(Math.max(0, used));
          }
        }

        // Build usage breakdown from usage records
        if (usage.length > 0) {
          const featureMap: Record<string, { used: number; cost: number }> = {};
          usage.forEach((u: any) => {
            const f = u.feature || 'Other';
            if (!featureMap[f]) featureMap[f] = { used: 0, cost: 0 };
            featureMap[f].used += 1;
            featureMap[f].cost += u.credits_used || 0;
          });

          const breakdown: CreditUsage[] = Object.entries(featureMap).map(([feature, data]) => ({
            feature,
            icon: feature.toLowerCase().includes('interview') ? <Mic size={16} /> : feature.toLowerCase().includes('assess') ? <ClipboardList size={16} /> : <FileText size={16} />,
            color: feature.toLowerCase().includes('interview') ? 'bg-violet-500' : feature.toLowerCase().includes('assess') ? 'bg-teal-500' : 'bg-amber-500',
            used: data.used,
            costPerOp: data.used > 0 ? Math.round(data.cost / data.used) : 1,
            totalCost: data.cost,
            trend: 0,
          }));
          if (!cancelled) setUsageBreakdown(breakdown);
        } else {
          // Fallback breakdown
          if (!cancelled) setUsageBreakdown(getDefaultBreakdown());
        }
      } catch {
        if (!cancelled) {
          setActivePlan(DEFAULT_PLAN);
          setCreditsUsed(31_840);
          setUsageBreakdown(getDefaultBreakdown());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSubscription();
    return () => { cancelled = true; };
  }, []);

  const creditsRemaining = activePlan.monthlyCredits - creditsUsed;
  const usagePct = Math.round((creditsUsed / activePlan.monthlyCredits) * 100);
  const selectedPkg = topUpPackages.find((p) => p.id === topUpQty);

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-7">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-700 text-slate-800">Subscription & Credits</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your active plan, monitor credit usage, and top-up as needed.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
            <Download size={15} />
            Export Invoice
          </button>
          <button className="flex items-center gap-1.5 text-sm text-white bg-[#0D9488] rounded-lg px-4 py-2 hover:bg-teal-700 transition-colors font-500">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Manage Plan
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Plan"
          value={loading ? '—' : activePlan.name}
          sub={`${activePlan.billingCycle === 'annual' ? 'Annual' : 'Monthly'} · renews ${activePlan.renewalDate.slice(0, 7)}`}
          icon={<Star size={18} />}
          color="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Monthly Credits"
          value={loading ? '—' : activePlan.monthlyCredits.toLocaleString()}
          sub="Resets on 1st each month"
          icon={<Zap size={18} />}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Credits Remaining"
          value={loading ? '—' : creditsRemaining.toLocaleString()}
          sub={`${100 - usagePct}% of monthly quota`}
          icon={<TrendingUp size={18} />}
          color="bg-teal-50 text-teal-600"
        />
        <StatCard
          label="Credits Used"
          value={loading ? '—' : creditsUsed.toLocaleString()}
          sub="This billing cycle"
          icon={<BarChart2 size={18} />}
          color="bg-sky-50 text-sky-600"
        />
      </div>

      {/* ── Active Plan Card + Credit Meter ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Plan details */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
            <div>
              <span className={`text-xs font-700 px-2.5 py-1 rounded-full ${activePlan.tier === 'Enterprise' ? 'bg-violet-50 text-violet-700' : activePlan.tier === 'Pro' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                {activePlan.tier}
              </span>
              <h2 className="text-lg font-700 text-slate-800 mt-2">{activePlan.name} Plan</h2>
              <p className="text-sm text-slate-500">${activePlan.price}/mo · {activePlan.billingCycle}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-600 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
              <CheckCircle2 size={12} /> Active
            </div>
          </div>
          <CreditMeter used={creditsUsed} total={activePlan.monthlyCredits} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {activePlan.features.slice(0, 6).map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 size={12} className="text-teal-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Usage breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-700 text-slate-800 mb-4">Usage Breakdown</h3>
          <div className="space-y-3">
            {usageBreakdown.map((item) => (
              <div key={item.feature} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg ${item.color} bg-opacity-10 flex items-center justify-center shrink-0`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-600 text-slate-700 truncate">{item.feature}</span>
                    <span className="text-xs font-700 text-slate-800 ml-2">{item.used.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(100, (item.totalCost / Math.max(1, creditsUsed)) * 100)}%` }} />
                  </div>
                </div>
                <span className={`text-[10px] font-600 ${item.trend > 0 ? 'text-emerald-600' : item.trend < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {item.trend > 0 ? `+${item.trend}%` : item.trend < 0 ? `${item.trend}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top-Up Packages ── */}
      <div>
        <h2 className="text-base font-700 text-slate-800 mb-4">Top-Up Packages</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {topUpPackages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => setTopUpQty(pkg.id)}
              className={`relative bg-white rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-md ${topUpQty === pkg.id ? 'border-[#0D9488] ring-2 ring-[#0D9488]/20' : 'border-slate-100'}`}
            >
              {pkg.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-700 bg-[#0D9488] text-white px-2.5 py-0.5 rounded-full">Most Popular</span>
              )}
              <p className="text-xl font-800 text-slate-800">{pkg.credits.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mb-3">credits</p>
              {pkg.bonus > 0 && (
                <p className="text-[10px] font-700 text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 inline-block mb-2">+{pkg.bonus.toLocaleString()} bonus</p>
              )}
              <p className="text-lg font-700 text-slate-800">${pkg.price}</p>
            </div>
          ))}
        </div>
        {topUpQty && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setConfirmTopUp(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0D9488] text-white text-sm font-600 rounded-xl hover:bg-teal-700 transition-colors"
            >
              <Zap size={15} />
              Purchase {selectedPkg?.credits.toLocaleString()} Credits for ${selectedPkg?.price}
            </button>
            <button onClick={() => setTopUpQty(null)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        )}
      </div>

      {/* ── Plan Comparison ── */}
      <div>
        <h2 className="text-base font-700 text-slate-800 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allPlans.map((plan) => (
            <div key={plan.tier} className={`bg-white rounded-xl border-2 ${plan.color} p-5 ${(plan as any).current ? 'ring-2 ring-amber-300' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-700 px-2.5 py-1 rounded-full ${plan.badge}`}>{plan.tier}</span>
                {(plan as any).current && <span className="text-[10px] font-700 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Current</span>}
              </div>
              <p className="text-2xl font-800 text-slate-800">₹{plan.price.toLocaleString()}<span className="text-sm font-500 text-slate-500">/mo</span></p>
              <p className="text-xs text-slate-500 mb-1">{plan.credits.toLocaleString()} credits/month</p>
              <p className="text-[10px] font-600 text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 inline-block mb-3">{(plan as any).infraReserve} infra reserve</p>
              <div className="space-y-1.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 size={11} className="text-teal-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              {!(plan as any).current && (
                <button className="mt-4 w-full py-2 text-sm font-600 text-[#0D9488] border border-[#0D9488]/30 rounded-xl hover:bg-teal-50 transition-colors">
                  Switch to {plan.tier}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getDefaultBreakdown(): CreditUsage[] {
  return [
    { feature: 'AI Interview', icon: <Mic size={16} />, color: 'bg-violet-500', used: 1_240, costPerOp: 5, totalCost: 6_200, trend: 18 },
    { feature: 'Assessment', icon: <ClipboardList size={16} />, color: 'bg-teal-500', used: 3_820, costPerOp: 2, totalCost: 7_640, trend: 7 },
    { feature: 'Resume Analysis', icon: <FileText size={16} />, color: 'bg-amber-500', used: 3_980, costPerOp: 1, totalCost: 3_980, trend: -4 },
    { feature: 'ATS Scoring', icon: <BarChart2 size={16} />, color: 'bg-sky-500', used: 0, costPerOp: 1, totalCost: 0, trend: 0 },
  ];
}
