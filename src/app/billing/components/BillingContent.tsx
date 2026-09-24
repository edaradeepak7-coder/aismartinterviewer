'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import {
  CreditCard, Download, RefreshCw, CheckCircle2, AlertCircle, Zap,
  Calendar, TrendingUp, BarChart2, FileText, ChevronDown, ChevronUp,
  Shield, Loader2, X, Plus, Trash2, ArrowDownCircle, XCircle, Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { csrfHeaders } from '@/lib/api/apiClient';
import { BILLING_PLANS } from '@/lib/billing/plans';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  price_inr: number;
  credits_total: number;
  credits_remaining: number;
  credits_used: number;
  overage_rate_paise: number;
  current_period_start: string;
  current_period_end: string;
  renewal_date: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  data_retain_until: string | null;
  downgrade_to_plan: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  status: string;
  amount_inr: number;
  total_amount_inr: number;
  credits_included: number;
  overage_credits: number;
  billing_period_start: string | null;
  billing_period_end: string | null;
  paid_at: string | null;
  created_at: string;
  razorpay_payment_id: string | null;
}

interface PaymentMethod {
  id: string;
  method_type: string;
  display_name: string;
  last_four: string | null;
  card_brand: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  upi_id: string | null;
  is_default: boolean;
}

interface UsageRecord {
  feature: string;
  credits_used: number;
  count: number;
}

// ─── Plan definitions (shared with server billing catalog) ───────────────────
const PLANS = BILLING_PLANS.map((p) => ({
  id: p.id,
  name: p.name,
  price: p.priceInr,
  credits: p.credits,
  overage_paise: p.overagePaise,
  color:
    p.id === 'starter' ? 'text-blue-700' :
    p.id === 'growth' ? 'text-violet-700' :
    p.id === 'pro' ? 'text-amber-700' : 'text-slate-600',
  bg:
    p.id === 'starter' ? 'bg-blue-50' :
    p.id === 'growth' ? 'bg-violet-50' :
    p.id === 'pro' ? 'bg-amber-50' : 'bg-slate-50',
  border:
    p.id === 'starter' ? 'border-blue-300' :
    p.id === 'growth' ? 'border-violet-300' :
    p.id === 'pro' ? 'border-amber-300' : 'border-slate-200',
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtINR(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    paid: 'bg-emerald-100 text-emerald-700',
    open: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    past_due: 'bg-red-100 text-red-700',
    trialing: 'bg-blue-100 text-blue-700',
    draft: 'bg-slate-100 text-slate-600',
    void: 'bg-slate-100 text-slate-500',
    prorated_refund: 'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`text-xs font-600 px-2 py-0.5 rounded-full capitalize ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function CreditMeter({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
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
export default function BillingContent() {
  const [tab, setTab] = useState<'overview' | 'invoices' | 'payment' | 'manage'>('overview');
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [usageBreakdown, setUsageBreakdown] = useState<UsageRecord[]>([]);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [selectedDowngradePlan, setSelectedDowngradePlan] = useState('');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [subRes, invRes, pmRes, usageRes] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('billing_invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('payment_methods').select('*').eq('user_id', user.id).order('is_default', { ascending: false }),
        supabase.from('credit_usage').select('feature, credits_used').eq('user_id', user.id).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      if (subRes.data) setSubscription(subRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (pmRes.data) setPaymentMethods(pmRes.data);

      if (usageRes.data) {
        const grouped: Record<string, UsageRecord> = {};
        usageRes.data.forEach((u: any) => {
          if (!grouped[u.feature]) grouped[u.feature] = { feature: u.feature, credits_used: 0, count: 0 };
          grouped[u.feature].credits_used += u.credits_used;
          grouped[u.feature].count += 1;
        });
        setUsageBreakdown(Object.values(grouped).sort((a, b) => b.credits_used - a.credits_used));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  // ─── Checkout for plan upgrade ─────────────────────────────────────────────
  const handleUpgrade = async (plan: typeof PLANS[0]) => {
    if (!scriptLoaded || processing || plan.price === 0) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price,
          currency: 'INR',
          billingCycle: 'monthly',
          receipt: `sub_${plan.id}_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Order creation failed');

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'AI Interview Platform',
        description: `${plan.name} Plan — ${plan.credits} credits/month`,
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: csrfHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({
                ...response,
                planId: plan.id,
                planName: plan.name,
                priceInr: plan.price,
                credits: plan.credits,
                billingCycle: 'monthly',
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) throw new Error(verifyData.error || 'Payment verification failed');

            showMsg('success', `Successfully upgraded to ${plan.name}! Your ${plan.credits} credits are ready.`);
            fetchData();
          } catch (err: any) {
            showMsg('error', err.message || 'Payment verification failed');
          }
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#7C3AED' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showMsg('error', err.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Cancel subscription ───────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!subscription) return;
    setProcessing(true);
    try {
      await supabase.from('subscriptions').update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
      }).eq('id', subscription.id);
      showMsg('success', 'Subscription will cancel at end of billing period. Your data is retained for 30 days.');
      setShowCancelModal(false);
      fetchData();
    } catch {
      showMsg('error', 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Downgrade ─────────────────────────────────────────────────────────────
  const handleDowngrade = async () => {
    if (!subscription || !selectedDowngradePlan) return;
    const newPlan = PLANS.find(p => p.id === selectedDowngradePlan);
    if (!newPlan) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('process_downgrade', {
        p_user_id: user.id,
        p_new_plan_id: newPlan.id,
        p_new_plan_name: newPlan.name,
        p_new_price: newPlan.price,
        p_new_credits: newPlan.credits,
        p_new_overage_rate: newPlan.overage_paise,
      });

      if (error) throw error;
      const result = data as any;
      showMsg('success', `Downgraded to ${newPlan.name}. Pro-rated credit: ₹${result?.prorated_refund_inr || 0}`);
      setShowDowngradeModal(false);
      fetchData();
    } catch (err: any) {
      showMsg('error', err.message || 'Downgrade failed');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Download invoice ──────────────────────────────────────────────────────
  const handleDownloadInvoice = (invoice: Invoice) => {
    const content = [
      'AI INTERVIEW PLATFORM — INVOICE',
      '================================',
      `Invoice #: ${invoice.invoice_number}`,
      `Date: ${fmtDate(invoice.created_at)}`,
      `Status: ${invoice.status.toUpperCase()}`,
      `Type: ${invoice.invoice_type.replace(/_/g, ' ')}`,
      '',
      `Amount: ₹${invoice.total_amount_inr.toLocaleString('en-IN')}`,
      invoice.credits_included > 0 ? `Credits Included: ${invoice.credits_included}` : '',
      invoice.billing_period_start ? `Period: ${fmtDate(invoice.billing_period_start)} – ${fmtDate(invoice.billing_period_end)}` : '',
      invoice.paid_at ? `Paid: ${fmtDate(invoice.paid_at)}` : '',
      invoice.razorpay_payment_id ? `Payment ID: ${invoice.razorpay_payment_id}` : '',
    ].filter(Boolean).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sub = subscription;
  const usagePct = sub ? Math.min(100, Math.round((sub.credits_used / sub.credits_total) * 100)) : 0;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptLoaded(true)} strategy="afterInteractive" />

      <div className="min-h-screen bg-slate-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-700 text-slate-800">Billing & Subscription</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your plan, credits, payment methods, and invoice history.</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Alert */}
        {msg && (
          <div className={`flex items-center gap-2 rounded-xl p-3 border ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span className="text-sm">{msg.text}</span>
            <button onClick={() => setMsg(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Current Plan', value: loading ? '—' : (sub?.plan_name || 'Free'), sub: sub?.billing_cycle === 'annual' ? 'Annual billing' : 'Monthly billing', icon: <Zap size={18} />, color: 'bg-violet-50 text-violet-600' },
            { label: 'Next Renewal', value: loading ? '—' : fmtDate(sub?.renewal_date || null), sub: sub?.cancel_at_period_end ? 'Cancels at period end' : 'Auto-renews', icon: <Calendar size={18} />, color: 'bg-sky-50 text-sky-600' },
            { label: 'Credits Used', value: loading ? '—' : (sub?.credits_used || 0).toLocaleString(), sub: `of ${(sub?.credits_total || 0).toLocaleString()} this cycle`, icon: <BarChart2 size={18} />, color: 'bg-amber-50 text-amber-600' },
            { label: 'Credits Remaining', value: loading ? '—' : (sub?.credits_remaining || 0).toLocaleString(), sub: `${100 - usagePct}% of quota left`, icon: <TrendingUp size={18} />, color: 'bg-teal-50 text-teal-600' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-100 p-5 flex items-start gap-4 shadow-sm">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${kpi.color}`}>{kpi.icon}</div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{kpi.label}</p>
                <p className="text-xl font-700 text-slate-800 leading-tight">{kpi.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="inline-flex bg-white border border-slate-100 rounded-xl p-1 gap-1 shadow-sm">
          {(['overview', 'invoices', 'payment', 'manage'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-600 capitalize transition-all ${tab === t ? 'bg-[#0D1B3E] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t === 'payment' ? 'Payment Methods' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Plan Card */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-700 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 capitalize">
                      {sub?.plan_name || 'Free'}
                    </span>
                    {sub?.cancel_at_period_end && (
                      <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-red-50 text-red-600">Cancels {fmtDate(sub.renewal_date)}</span>
                    )}
                  </div>
                  <h2 className="text-lg font-700 text-slate-800 mt-1">{sub?.plan_name || 'Free'} Plan</h2>
                  <p className="text-sm text-slate-500">
                    {sub ? `₹${sub.price_inr.toLocaleString('en-IN')}/mo · renews ${fmtDate(sub.renewal_date)}` : 'No active subscription'}
                  </p>
                </div>
                <StatusBadge status={sub?.status || 'active'} />
              </div>

              {sub && <CreditMeter used={sub.credits_used} total={sub.credits_total} />}

              {sub?.cancel_at_period_end && (
                <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <Clock size={14} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Your subscription will cancel on <strong>{fmtDate(sub.renewal_date)}</strong>. Data retained for 30 days after cancellation.
                  </p>
                </div>
              )}

              {sub?.data_retain_until && sub.status === 'cancelled' && (
                <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={14} className="text-red-600 shrink-0" />
                  <p className="text-xs text-red-700">
                    Account cancelled. Data retained until <strong>{fmtDate(sub.data_retain_until)}</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Usage Breakdown */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-700 text-slate-800 mb-4">Usage This Cycle</h3>
              {loading ? (
                <div className="flex items-center justify-center h-24"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
              ) : usageBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No usage recorded yet this cycle.</p>
              ) : (
                <div className="space-y-3">
                  {usageBreakdown.map((item) => (
                    <div key={item.feature} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-600 text-slate-700 truncate">{item.feature}</span>
                          <span className="text-xs font-700 text-slate-800 ml-2">{item.credits_used} cr</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${sub ? Math.min(100, (item.credits_used / sub.credits_total) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── INVOICES TAB ── */}
        {tab === 'invoices' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-600" />
                <h2 className="text-sm font-700 text-slate-800">Invoice History</h2>
              </div>
              <span className="text-xs text-slate-400">{invoices.length} invoices</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FileText size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No invoices yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {invoices.map((inv) => (
                  <div key={inv.id}>
                    <div
                      className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 cursor-pointer"
                      onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-700 text-slate-800">{inv.invoice_number}</p>
                          <p className="text-xs text-slate-400 capitalize">{inv.invoice_type.replace(/_/g, ' ')} · {fmtDate(inv.created_at)}</p>
                        </div>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-700 text-slate-800">
                            {inv.total_amount_inr < 0 ? '-' : ''}₹{Math.abs(inv.total_amount_inr).toLocaleString('en-IN')}
                          </p>
                          {inv.credits_included > 0 && (
                            <p className="text-xs text-slate-400">{inv.credits_included} credits</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(inv); }}
                          className="flex items-center gap-1.5 text-xs text-[#0D9488] border border-[#0D9488]/30 rounded-lg px-2.5 py-1.5 hover:bg-teal-50 transition-colors"
                        >
                          <Download size={12} />
                          Download
                        </button>
                        {expandedInvoice === inv.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </div>
                    {expandedInvoice === inv.id && (
                      <div className="px-6 pb-4 bg-slate-50/50 border-t border-slate-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3">
                          {[
                            { label: 'Invoice #', value: inv.invoice_number },
                            { label: 'Type', value: inv.invoice_type.replace(/_/g, ' ') },
                            { label: 'Period', value: inv.billing_period_start ? `${fmtDate(inv.billing_period_start)} – ${fmtDate(inv.billing_period_end)}` : '—' },
                            { label: 'Paid On', value: fmtDate(inv.paid_at) },
                            { label: 'Amount', value: `₹${Math.abs(inv.total_amount_inr).toLocaleString('en-IN')}` },
                            { label: 'Credits', value: inv.credits_included > 0 ? inv.credits_included.toString() : '—' },
                            { label: 'Overage Credits', value: inv.overage_credits > 0 ? inv.overage_credits.toString() : '—' },
                            { label: 'Payment ID', value: inv.razorpay_payment_id || '—' },
                          ].map((row) => (
                            <div key={row.label}>
                              <p className="text-xs text-slate-400">{row.label}</p>
                              <p className="text-xs font-600 text-slate-700 capitalize">{row.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENT METHODS TAB ── */}
        {tab === 'payment' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-slate-600" />
                <h2 className="text-sm font-700 text-slate-800">Payment Methods</h2>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CreditCard size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No payment methods saved.</p>
                <p className="text-xs mt-1">Payment methods are saved automatically when you complete a purchase.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <CreditCard size={18} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-700 text-slate-800">{pm.display_name}</p>
                        {pm.expiry_month && pm.expiry_year && (
                          <p className="text-xs text-slate-400">Expires {pm.expiry_month}/{pm.expiry_year}</p>
                        )}
                        {pm.upi_id && <p className="text-xs text-slate-400">{pm.upi_id}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {pm.is_default && (
                        <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Default</span>
                      )}
                      <button
                        onClick={async () => {
                          await supabase.from('payment_methods').delete().eq('id', pm.id);
                          fetchData();
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Shield size={11} />
                Payment details are securely processed. We do not store full card numbers.
              </p>
            </div>
          </div>
        )}

        {/* ── MANAGE TAB ── */}
        {tab === 'manage' && (
          <div className="space-y-5">
            {/* Upgrade Plans */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-base font-700 text-slate-800 mb-4">Change Plan</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PLANS.map((plan) => {
                  const isCurrent = sub?.plan_id === plan.id;
                  const isDowngrade = sub && plan.price < sub.price_inr;
                  return (
                    <div key={plan.id} className={`rounded-xl border-2 p-4 ${plan.bg} ${plan.border} ${isCurrent ? 'ring-2 ring-offset-1 ring-violet-400' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-700 ${plan.color}`}>{plan.name}</span>
                        {isCurrent && <span className="text-[10px] font-700 bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Current</span>}
                      </div>
                      <p className="text-2xl font-800 text-slate-800">
                        {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString('en-IN')}`}
                        {plan.price > 0 && <span className="text-xs font-500 text-slate-500">/mo</span>}
                      </p>
                      <p className="text-xs text-slate-500 mb-3">{plan.credits.toLocaleString()} credits/month</p>
                      {!isCurrent && (
                        <button
                          onClick={() => {
                            if (isDowngrade) { setSelectedDowngradePlan(plan.id); setShowDowngradeModal(true); }
                            else handleUpgrade(plan);
                          }}
                          disabled={processing}
                          className={`w-full py-2 rounded-lg text-xs font-700 transition-colors ${isDowngrade ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-[#0D1B3E] text-white hover:bg-[#1a2f5e]'}`}
                        >
                          {isDowngrade ? (
                            <span className="flex items-center justify-center gap-1"><ArrowDownCircle size={12} /> Downgrade</span>
                          ) : (
                            <span className="flex items-center justify-center gap-1"><Plus size={12} /> Upgrade</span>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danger Zone */}
            {sub && sub.status === 'active' && !sub.cancel_at_period_end && (
              <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
                <h2 className="text-base font-700 text-red-700 mb-1">Cancel Subscription</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Your subscription will remain active until <strong>{fmtDate(sub.renewal_date)}</strong>. After cancellation, charges stop and your data is retained for 30 days.
                </p>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-600 hover:bg-red-100 transition-colors"
                >
                  <XCircle size={15} />
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle size={20} className="text-red-600" />
              </div>
              <h3 className="text-base font-700 text-slate-800">Cancel Subscription?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">Your subscription will remain active until <strong>{fmtDate(sub?.renewal_date || null)}</strong>.</p>
            <ul className="text-xs text-slate-500 space-y-1 mb-5 list-disc list-inside">
              <li>No further charges will be made</li>
              <li>You keep access until the period ends</li>
              <li>Your data is retained for 30 days after cancellation</li>
            </ul>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-600 text-slate-600 hover:bg-slate-50">Keep Plan</button>
              <button onClick={handleCancel} disabled={processing} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-600 hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade Modal */}
      {showDowngradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <ArrowDownCircle size={20} className="text-amber-600" />
              </div>
              <h3 className="text-base font-700 text-slate-800">Downgrade Plan?</h3>
            </div>
            {(() => {
              const newPlan = PLANS.find(p => p.id === selectedDowngradePlan);
              if (!newPlan || !sub) return null;
              const daysTotal = 30;
              const daysRemaining = Math.max(0, Math.round((new Date(sub.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const prorated = Math.round((sub.price_inr / daysTotal) * daysRemaining);
              return (
                <>
                  <p className="text-sm text-slate-600 mb-3">
                    Downgrading from <strong>{sub.plan_name}</strong> to <strong>{newPlan.name}</strong> takes effect immediately.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    <p className="text-xs text-amber-700">
                      <strong>Pro-rated credit: ₹{prorated.toLocaleString('en-IN')}</strong> will be applied to your account for the remaining {daysRemaining} days.
                    </p>
                  </div>
                  <ul className="text-xs text-slate-500 space-y-1 mb-5 list-disc list-inside">
                    <li>Credits reduced to {newPlan.credits}/month immediately</li>
                    <li>Existing credits above new limit are forfeited</li>
                    <li>New overage rate: ₹{newPlan.overage_paise / 100}/credit</li>
                  </ul>
                </>
              );
            })()}
            <div className="flex gap-3">
              <button onClick={() => setShowDowngradeModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-600 text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleDowngrade} disabled={processing} className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-600 hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Downgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
